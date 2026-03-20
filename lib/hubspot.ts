import hubspot from "@hubspot/api-client";

const client = new hubspot.Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
});

function toHubspotDate(value?: string) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;

  // HubSpot date properties esperan timestamp en milisegundos para date picker
  return String(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toHubspotBoolean(value: unknown) {
  if (value === true || value === "true" || value === 1 || value === "1") return "true";
  if (value === false || value === "false" || value === 0 || value === "0") return "false";
  return undefined;
}

function cleanProperties(obj: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
}

export async function upsertHubspotLead(data: any) {
  const email = (data.email || "").trim().toLowerCase();

  if (!email) {
    throw new Error("El email es obligatorio para enviar a HubSpot");
  }

  const properties = cleanProperties({
    email,
    firstname: data.nombreCompleto,
    date_of_birth:data.fechaNacimiento,
    country: data.provincia,
    city: data.localidad,
    zip: data.codigoPostal,
    phone: data.celular,
    riesgo: data.riesgo,
    patente: data.patente?.toUpperCase(),
    marca: data.marca,
    modelo: data.modelo,
    version: data.version,
    anio: data.anio ? String(data.anio) : undefined,
    numero_motor: data.motor,
    numero_chasis: data.chasis,
    es_0km: toHubspotBoolean(data.es0km),
    es_prendado: toHubspotBoolean(data.esPrendado),
    fecha_fin_prenda: toHubspotDate(data.fechaFinPrenda),
    vendedor: data.vendedor,
    productor_agencia: data.productorAgencia,
  });

  console.log("PROPERTIES A ENVIAR:", properties);

  const response = await client.apiRequest({
    method: "POST",
    path: "/crm/v3/objects/contacts/batch/upsert",
    body: {
      inputs: [
        {
          id: email,
          idProperty: "email",
          properties,
        },
      ],
    },
  });

  const result = await response.json();
  console.log("RESPUESTA UPSERT HUBSPOT:", result);

  const createdOrUpdated = result?.results?.[0];

  if (!createdOrUpdated?.id) {
    throw new Error(
      `HubSpot no devolvió un id válido: ${JSON.stringify(result)}`
    );
  }

  return createdOrUpdated;
}