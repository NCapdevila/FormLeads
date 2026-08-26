// Webhook del cotizador de ABSA (servicio `absa-cotizador`).
//
// Se dispara desde app/api/leads/route.ts DESPUÉS de crear el contacto y el
// deal en HubSpot: sin `dealId` no hay nada que mandar. El servicio responde
// 202 al instante y cotiza en segundo plano; uno o dos minutos después escribe el
// resultado en el Deal (`absa_estado`, `absa_numero_cotizacion`,
// `cotizacion_absa`). Nada de eso vuelve por acá.
//
// Es best-effort: el lead ya quedó guardado en HubSpot, así que si el webhook
// falla se loguea el motivo y se sigue. Estas funciones nunca tiran.

const WEBHOOK_URL = process.env.ABSA_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.ABSA_WEBHOOK_SECRET;

const TIMEOUT_MS = 10_000;

// El lead ya normalizado por app/api/leads/route.ts (nombre, apellido y
// localidad en Title Case, `genero` reducido a "M" | "F" | undefined).
export interface LeadNormalizado {
  riesgo?: string;
  genero?: string;
  nombre?: string;
  apellido?: string;
  fechaNacimiento?: string;
  dni?: string;
  localidad?: string;
  codigoPostal?: string;
  marca?: string;
  modelo?: string;
  version?: string;
  anio?: string | number;
  patente?: string;
  productorAgencia?: string;
}

// El input del form es type="date", o sea ya viene YYYY-MM-DD. Se acepta
// igual DD/MM/YYYY por si el valor llegó de una pre-carga.
function toFechaAbsa(value?: string) {
  if (!value?.trim()) return undefined;

  const iso = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const barras = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (barras) {
    const [, dia, mes, anio] = barras;
    return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  return undefined;
}

// El body que espera POST /webhooks/hubspot/absa.
//
// Ojo con dos campos:
// - `provincia` NO va: ABSA la deduce del código postal, igual que el portal.
// - `localidad` no es decorativa: un CP cubre muchas localidades (el 1849
//   devuelve 11) y ABSA las ordena alfabéticamente, así que sin el nombre
//   cotiza con la primera y la localidad entra en el cálculo de la prima.
export interface AbsaWebhookPayload {
  dealId: string;
  contactId: string;
  firstname: string;
  lastname: string;
  productor: string;
  dni: string;
  sexo: string;
  fecha_nacimiento: string;
  codigo_postal: string;
  localidad: string;
  marca_vehiculo: string;
  modelo_vehiculo: string;
  version_vehiculo: string;
  anio_vehiculo: string;
  patente: string;
}

// Devuelve el payload listo, o los motivos por los que este lead no se puede
// cotizar en ABSA. Cada llamada cotiza de verdad (consume la sesión del
// broker y deja la cotización guardada en la cuenta de ABSA), así que solo
// van los leads que tienen todo lo que el cotizador necesita.
export function armarPayloadAbsa(
  data: LeadNormalizado,
  contactoId: string,
  dealId: string
): { payload: AbsaWebhookPayload } | { motivos: string[] } {
  const motivos: string[] = [];

  // ABSA cotiza autos: MOTO, HOGAR y el resto no van.
  if (data.riesgo !== "AUTO") {
    motivos.push(`riesgo ${data.riesgo || "(vacío)"} no es AUTO`);
  }

  // `sexo` es obligatorio para el cotizador.
  const sexo = data.genero;
  if (sexo !== "M" && sexo !== "F") motivos.push("falta género");

  const fechaNacimiento = toFechaAbsa(data.fechaNacimiento);
  if (!fechaNacimiento) motivos.push("falta fecha de nacimiento");

  const codigoPostal = (data.codigoPostal || "").trim();
  if (!codigoPostal) motivos.push("falta código postal");

  const localidad = (data.localidad || "").trim();
  if (!localidad) motivos.push("falta localidad");

  const marca = (data.marca || "").trim();
  if (!marca) motivos.push("falta marca");

  const modelo = (data.modelo || "").trim();
  if (!modelo) motivos.push("falta modelo");

  const version = (data.version || "").trim();
  if (!version) motivos.push("falta versión");

  const anio = String(data.anio ?? "").trim();
  if (!anio) motivos.push("falta año");

  if (motivos.length > 0 || !sexo || !fechaNacimiento) {
    return { motivos };
  }

  return {
    payload: {
      dealId,
      contactId: contactoId,
      firstname: data.nombre || "",
      lastname: data.apellido || "",
      // Se traduce a un productor de ABSA con `config/absa-productores.json`
      // (match exacto) del lado del servicio. Lo que no esté mapeado cotiza
      // con el productor por defecto.
      productor: data.productorAgencia || "",
      // Opcional del lado de ABSA.
      dni: (data.dni || "").replace(/\D/g, ""),
      sexo,
      fecha_nacimiento: fechaNacimiento,
      codigo_postal: codigoPostal,
      localidad,
      marca_vehiculo: marca,
      modelo_vehiculo: modelo,
      version_vehiculo: version,
      anio_vehiculo: anio,
      patente: (data.patente || "").trim().toUpperCase(),
    },
  };
}

export type ResultadoAbsa =
  | { enviado: true; duplicado: boolean }
  | { enviado: false; motivo: string };

export async function cotizarEnAbsa(
  data: LeadNormalizado,
  contactoId: string,
  dealId: string
): Promise<ResultadoAbsa> {
  if (!WEBHOOK_URL || !WEBHOOK_SECRET) {
    return {
      enviado: false,
      motivo: "ABSA_WEBHOOK_URL / ABSA_WEBHOOK_SECRET sin configurar",
    };
  }

  const armado = armarPayloadAbsa(data, contactoId, dealId);
  if ("motivos" in armado) {
    return { enviado: false, motivo: armado.motivos.join("; ") };
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": WEBHOOK_SECRET,
      },
      body: JSON.stringify(armado.payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      // 404: al servidor le faltan HUBSPOT_ACCESS_TOKEN / HUBSPOT_WEBHOOK_SECRET.
      // 401: el x-webhook-secret no coincide.
      const detalle = await response.text().catch(() => "");
      return { enviado: false, motivo: `HTTP ${response.status} ${detalle}`.trim() };
    }

    // 202: encolado. Si el mismo dealId ya estaba en vuelo responde
    // `duplicado: true` y no encola de nuevo.
    const body = await response.json().catch(() => ({}));
    return { enviado: true, duplicado: body?.duplicado === true };
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    const motivo =
      err?.name === "TimeoutError" ? `timeout (${TIMEOUT_MS} ms)` : err?.message || "error de red";
    return { enviado: false, motivo };
  }
}
