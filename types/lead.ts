// Fuente de verdad: lo que arma LeadForm y lo que valida/normaliza
// app/api/leads/route.ts. Si agregás un campo al form, agregalo acá.

// Los valores del <select name="riesgo"> del form. Ojo: es un dominio más
// ancho que el de precargas.riesgo (ver RiesgoPrecarga en types/precarga.ts).
export type RiesgoType =
  | ""
  | "AUTO"
  | "MOTO"
  | "HOGAR"
  | "VIDA"
  | "NOTEBOOK"
  | "CELULAR"
  | "TRAILER"
  | "CUATRICICLO"
  | "MONOPATIN";

// Selector M | F del form. Viaja a HubSpot como la property `gender` del
// contacto (ver lib/hubspot.ts). Es opcional: si queda vacío no se manda.
export type GeneroType = "" | "M" | "F";

export interface LeadFormData {
  // Persona — nombre y apellido van separados: la API los manda a HubSpot
  // como firstname / lastname.
  nombre: string;
  apellido: string;
  genero: GeneroType;
  fechaNacimiento: string;
  dni: string;
  email: string;
  celular: string;

  // Ubicación
  provincia: string;
  localidad: string;
  codigoPostal: string;

  // Riesgo y vehículo
  riesgo: RiesgoType;
  patente: string;
  marca: string;
  modelo: string;
  version: string;
  anio: string;
  motor: string;
  chasis: string;
  es0km: boolean;
  esPrendado: boolean;
  retira_ahora: boolean;
  retira_hoy: boolean;
  g: boolean; // GNC
  fechaFinPrenda: string;

  // Comercial
  vendedor: string;
  productorAgencia: string;

  // Viaja al deal de HubSpot como la property `comentarios`
  observaciones: string;
}

export const leadFormVacio: LeadFormData = {
  nombre: "",
  apellido: "",
  genero: "",
  fechaNacimiento: "",
  dni: "",
  email: "",
  celular: "",
  provincia: "",
  localidad: "",
  codigoPostal: "",
  riesgo: "",
  patente: "",
  marca: "",
  modelo: "",
  version: "",
  anio: "",
  motor: "",
  chasis: "",
  es0km: false,
  esPrendado: false,
  retira_ahora: false,
  retira_hoy: false,
  g: false,
  fechaFinPrenda: "",
  vendedor: "",
  productorAgencia: "",
  observaciones: "",
};
