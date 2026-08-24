// Espejo de la tabla `precargas` de Supabase. La escribe el bot de WhatsApp
// (repo botConceWp); FormLeads solo hace SELECT y el UPDATE de `estado`.

// Dominio de la columna, más angosto que el RiesgoType del form.
export type RiesgoPrecarga = "AUTO" | "MOTO" | "HOGAR" | "OTRO";

export type EstadoPrecarga = "pendiente" | "cargado" | "descartado";

export interface Precarga {
  id: string;

  // Procedencia
  grupo_id: string | null;
  concesionaria: string | null;
  // LID de WhatsApp (…@lid). NO es un teléfono y no se puede convertir a uno,
  // así que no se muestra en la UI: para origen usamos `concesionaria`.
  remitente: string | null;

  // Persona — todo nullable, una pre-carga incompleta es lo normal
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  fecha_nacimiento: string | null;
  provincia: string | null;
  localidad: string | null;
  codigo_postal: string | null;
  email: string | null;
  celular: string | null;

  // Vehículo
  riesgo: RiesgoPrecarga | null;
  patente: string | null;
  marca: string | null;
  modelo: string | null;
  version: string | null;
  anio: string | null;
  motor: string | null;
  chasis: string | null;
  // Nullable de verdad: null != false (null = el bot no pudo determinarlo).
  es_0km: boolean | null;
  es_prendado: boolean | null;
  fecha_fin_prenda: string | null;

  // Metadata de la extracción
  confianza: number | null;
  riesgo_confianza: number | null;
  campos_dudosos: string[] | null;
  modelo_usado: string | null;

  // Estado
  estado: EstadoPrecarga;
  created_at: string;
  updated_at: string;
}

// Las columnas que pedimos. `foto_urls` queda afuera a propósito: siempre
// viene vacío (se decidió no guardar imágenes) y no aporta nada a la UI.
export const COLUMNAS_PRECARGA = `
  id, grupo_id, concesionaria, remitente,
  nombre, apellido, dni, fecha_nacimiento, provincia, localidad,
  codigo_postal, email, celular,
  riesgo, patente, marca, modelo, version, anio, motor, chasis,
  es_0km, es_prendado, fecha_fin_prenda,
  confianza, riesgo_confianza, campos_dudosos, modelo_usado,
  estado, created_at, updated_at
`;
