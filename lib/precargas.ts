"use client";

import { supabase } from "@/lib/supabase";
import { COLUMNAS_PRECARGA, type Precarga } from "@/types/precarga";
import type { LeadFormData, RiesgoType } from "@/types/lead";

// Mismo formato de título que se usa en HubSpot para el deal.
export function tituloPrecarga(p: Precarga) {
  return [
    p.concesionaria || "sin concesionaria",
    p.riesgo || "sin riesgo",
    p.patente || "sin patente",
    p.email || "sin mail",
  ].join(" - ");
}

export async function listarPendientes(): Promise<Precarga[]> {
  const { data, error } = await supabase
    .from("precargas")
    .select(COLUMNAS_PRECARGA)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Precarga[];
}

export async function contarPendientes(): Promise<number> {
  const { count, error } = await supabase
    .from("precargas")
    .select("id", { count: "exact", head: true })
    .eq("estado", "pendiente");

  if (error) throw error;
  return count ?? 0;
}

// Único write que hace FormLeads. Se llama recién cuando el POST a /api/leads
// salió bien — nunca al abrir el form.
export async function marcarCargada(id: string) {
  const { error } = await supabase
    .from("precargas")
    .update({ estado: "cargado" })
    .eq("id", id);

  if (error) throw error;
}

// --- Mapeo precarga -> form -------------------------------------------------

// Nombre de columna en Supabase -> nombre del campo en LeadFormData.
// Se usa para traducir `campos_dudosos`, que viene con nombres de columna.
export const MAPA_CAMPOS: Record<string, keyof LeadFormData> = {
  nombre: "nombre",
  apellido: "apellido",
  dni: "dni",
  fecha_nacimiento: "fechaNacimiento",
  provincia: "provincia",
  localidad: "localidad",
  codigo_postal: "codigoPostal",
  email: "email",
  celular: "celular",
  riesgo: "riesgo",
  patente: "patente",
  marca: "marca",
  modelo: "modelo",
  version: "version",
  anio: "anio",
  motor: "motor",
  chasis: "chasis",
  es_0km: "es0km",
  es_prendado: "esPrendado",
  fecha_fin_prenda: "fechaFinPrenda",
};

export const ETIQUETAS: Partial<Record<keyof LeadFormData, string>> = {
  nombre: "Nombre",
  apellido: "Apellido",
  dni: "DNI",
  fechaNacimiento: "Fecha de nacimiento",
  provincia: "Provincia",
  localidad: "Localidad",
  codigoPostal: "Código postal",
  email: "Email",
  celular: "Celular",
  riesgo: "Riesgo",
  patente: "Patente",
  marca: "Marca",
  modelo: "Modelo",
  version: "Versión",
  anio: "Año",
  motor: "Motor",
  chasis: "Chasis",
  es0km: "0km",
  esPrendado: "Prendado",
  fechaFinPrenda: "Fin de prenda",
};

// Las fechas son text y pueden venir parciales (ej. "2026-03" si el documento
// no traía el día). Un input type="date" rechaza eso, así que sólo pre-cargamos
// la fecha cuando está completa; si es parcial la dejamos vacía y devolvemos el
// valor crudo como nota, para que el data entry complete el día a mano en vez
// de que nosotros lo inventemos.
export function esFechaCompleta(valor: string | null): boolean {
  if (!valor) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  return !Number.isNaN(new Date(`${valor}T00:00:00`).getTime());
}

// El form tiene más opciones de riesgo que la columna. AUTO/MOTO/HOGAR
// coinciden; "OTRO" no existe en el select, así que se deja sin elegir.
function riesgoAlForm(riesgo: Precarga["riesgo"]): RiesgoType {
  if (riesgo === "AUTO" || riesgo === "MOTO" || riesgo === "HOGAR") return riesgo;
  return "";
}

export interface PrecargaMapeada {
  valores: Partial<LeadFormData>;
  /** Campos del form a resaltar: los dudosos + los que quedaron sin pre-cargar. */
  camposDudosos: (keyof LeadFormData)[];
  /** Aclaraciones por campo, ej. una fecha parcial que no entró en el input. */
  notas: Partial<Record<keyof LeadFormData, string>>;
}

export function precargaAFormulario(p: Precarga): PrecargaMapeada {
  const notas: Partial<Record<keyof LeadFormData, string>> = {};

  const valores: Partial<LeadFormData> = {
    nombre: p.nombre ?? "",
    apellido: p.apellido ?? "",
    dni: p.dni ?? "",
    email: p.email ?? "",
    celular: p.celular ?? "",
    provincia: p.provincia ?? "",
    localidad: p.localidad ?? "",
    codigoPostal: p.codigo_postal ?? "",
    riesgo: riesgoAlForm(p.riesgo),
    patente: p.patente ?? "",
    marca: p.marca ?? "",
    modelo: p.modelo ?? "",
    version: p.version ?? "",
    anio: p.anio ?? "",
    motor: p.motor ?? "",
    chasis: p.chasis ?? "",
    // null != false, pero el checkbox necesita un boolean. El null se refleja
    // como "sin dato" en el modal, no acá.
    es0km: p.es_0km ?? false,
    esPrendado: p.es_prendado ?? false,
  };

  if (esFechaCompleta(p.fecha_nacimiento)) {
    valores.fechaNacimiento = p.fecha_nacimiento!;
  } else if (p.fecha_nacimiento) {
    valores.fechaNacimiento = "";
    notas.fechaNacimiento = `La pre-carga trae "${p.fecha_nacimiento}" — fecha incompleta, cargala a mano.`;
  }

  if (esFechaCompleta(p.fecha_fin_prenda)) {
    valores.fechaFinPrenda = p.fecha_fin_prenda!;
  } else if (p.fecha_fin_prenda) {
    valores.fechaFinPrenda = "";
    notas.fechaFinPrenda = `La pre-carga trae "${p.fecha_fin_prenda}" — fecha incompleta, cargala a mano.`;
  }

  if (p.riesgo === "OTRO") {
    notas.riesgo = 'La pre-carga dice "OTRO": elegí el riesgo que corresponda.';
  }

  const dudosos = new Set<keyof LeadFormData>();
  for (const columna of p.campos_dudosos ?? []) {
    const campo = MAPA_CAMPOS[columna];
    if (campo) dudosos.add(campo);
  }
  // Un campo con nota también se resalta, aunque el bot no lo haya marcado.
  for (const campo of Object.keys(notas) as (keyof LeadFormData)[]) {
    dudosos.add(campo);
  }

  return { valores, camposDudosos: [...dudosos], notas };
}
