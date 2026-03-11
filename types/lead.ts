export type RiesgoType = "AUTO" | "MOTO" | "HOGAR" | "OTRO" | "";

export interface LeadFormData {
  nombreCompleto: string;
  fechaNacimiento: string;
  provincia: string;
  localidad: string;
  codigoPostal: string;
  email: string;
  celular: string;
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
  fechaFinPrenda: string;
  vendedor: string;
  productorAgencia: string;
}