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

// Upsert contacto — solo datos de la persona
export async function upsertContacto(data: any) {
  const email = (data.email || "").trim().toLowerCase();
  if (!email) throw new Error("El email es obligatorio");

  const properties = cleanProperties({
    email,
    firstname: data.nombre,
    lastname: data.apellido,
    date_of_birth: data.fechaNacimiento,
    country: data.provincia,
    city: data.localidad,
    zip: data.codigoPostal,
    phone: data.celular,
    hubspot_owner_id: data.vendedor,
    productor_agencia: data.productorAgencia,
    es_referido: toHubspotBoolean(data.esReferido),
    lifecyclestage: "lead",
    lead_source: "Formulario Web",
  });

  const response = await client.apiRequest({
    method: "POST",
    path: "/crm/v3/objects/contacts/batch/upsert",
    body: {
      inputs: [{ id: email, idProperty: "email", properties }],
    },
  });

  const result = await response.json();
  const contacto = result?.results?.[0];
  if (!contacto?.id) throw new Error(`Error upsert contacto: ${JSON.stringify(result)}`);
  
  return contacto;
}

// Crear deal — siempre nuevo, asociado al contacto
export async function crearDeal(data: any, contactoId: string) {
  const properties = cleanProperties({
    dealname: `${data.nombre} ${data.apellido} - ${data.riesgo}`,
    pipeline: "default", 
    dealstage: "appointmentscheduled", 
    hubspot_owner_id: data.vendedor,
    tipo_riesgo: data.riesgo,
    patente_vehiculo: data.patente?.toUpperCase(),
    marca_vehiculo: data.marca,
    modelo_vehiculo: data.modelo,
    version_vehiculo: data.version,
    anio_vehiculo: data.anio ? String(data.anio) : undefined,
    numero_motor: data.motor,
    numero_chasis: data.chasis,
    es_0km: toHubspotBoolean(data.es0km),
    es_prendado: toHubspotBoolean(data.esPrendado),
    fecha_fin_prenda: toHubspotDate(data.fechaFinPrenda),
  });

  const response = await client.apiRequest({
    method: "POST",
    path: "/crm/v3/objects/deals",
    body: {
      properties,
      associations: [
        {
          to: { id: contactoId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
        },
      ],
    },
  });

  const deal = await response.json();
  if (!deal?.id) throw new Error(`Error crear deal: ${JSON.stringify(deal)}`);

  return deal;
}

export async function crearLeadYDeal(data: any) {
  const contacto = await upsertContacto(data);
  const deal = await crearDeal(data, contacto.id);
  return { contacto, deal };
}