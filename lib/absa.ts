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


// DataCar no devuelve la version por separado: mete marca+version juntas en
// `model` ("TRACKER 1.2T AT PREMIER") y deja la carroceria en `type`
// ("RURAL 5 PUERTAS"). ABSA, en cambio, quiere modelo y version separados
// ("TRACKER" + "1.2 TURBO AT PREMIER"), asi que hay que partir el string.
//
// El corte va en el primer token que parece cilindrada (1.2, 1.4, 2.2JTS).
// Eso respeta los modelos de dos palabras: "GOL TREND 1.6" corta en "1.6",
// no despues de "GOL". Si no hay cilindrada ("2008 GT T200 AM26") cae a la
// primera palabra, que es lo mejor que se puede hacer a ciegas.
const CILINDRADA = /^\d+[.,]\d/;

export function separarModeloVersion(modelo: string): { modelo: string; version: string } {
  const tokens = modelo.trim().split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return { modelo: tokens.join(" "), version: "" };

  // Desde 1: si el modelo ya arranca con un numero ("159 2.2JTS", "2008 GT")
  // ese numero es el nombre del modelo, no la cilindrada.
  const corte = tokens.findIndex((t, i) => i >= 1 && CILINDRADA.test(t));
  const i = corte === -1 ? 1 : corte;

  return { modelo: tokens.slice(0, i).join(" "), version: tokens.slice(i).join(" ") };
}

// Lo que DataCar deja en el campo `version` del form es la carroceria, que a
// ABSA no le sirve. Pero el campo es editable, asi que si alguien escribio una
// version de verdad hay que respetarla en vez de pisarla.
const CARROCERIA = /\b(PUERTAS?|SEDAN|RURAL|COUPE|CUPE|PICK[\s-]?UP|FURGON|MONOVOLUMEN|HATCHBACK|CABINA)\b/i;

export function esCarroceria(value: string) {
  return CARROCERIA.test(value);
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

  // La version que manda el form suele ser la carroceria de DataCar, que a
  // ABSA no le sirve, asi que no se exige: la real sale del modelo.
  const versionForm = (data.version || "").trim();

  const anio = String(data.anio ?? "").trim();
  if (!anio) motivos.push("falta año");

  if (motivos.length > 0 || !sexo || !fechaNacimiento) {
    return { motivos };
  }

  // Si el vendedor escribio una version de verdad, gana sobre la del modelo.
  const partido = separarModeloVersion(modelo);
  if (versionForm && !esCarroceria(versionForm)) partido.version = versionForm;

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
      modelo_vehiculo: partido.modelo,
      version_vehiculo: partido.version,
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
