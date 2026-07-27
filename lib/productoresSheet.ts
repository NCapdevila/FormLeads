import { productores as productoresRespaldo } from "@/lib/productores";

export type OpcionProductor = {
  value: string;
  label: string;
};

// Marcas de acento que quedan sueltas después del normalize("NFD")
const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

const VALORES_INACTIVOS = new Set(["no", "false", "0", "inactivo", "baja"]);

const normalizar = (texto: string) =>
  texto.trim().toLowerCase().normalize("NFD").replace(DIACRITICOS, "");

// Acepta el ID pelado, la URL completa del navegador, o el ID con /edit?gid=... pegado
function parsearSheet(crudo?: string) {
  const valor = crudo?.trim();
  if (!valor) return null;

  const id =
    valor.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] ??
    valor.match(/^([a-zA-Z0-9-_]{20,})/)?.[1];
  if (!id) return null;

  return { id, gid: valor.match(/[#&?]gid=(\d+)/)?.[1] };
}

function construirUrl({ id, gid }: { id: string; gid?: string }) {
  const base = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
  return gid ? `${base}&gid=${gid}` : `${base}&sheet=productores`;
}

// Los nombres tienen comas ("Trebol, Concesionaria"), así que no alcanza con split(",")
function parsearCsv(texto: string) {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let enComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const caracter = texto[i];

    if (enComillas) {
      if (caracter !== '"') {
        campo += caracter;
      } else if (texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else {
        enComillas = false;
      }
      continue;
    }

    if (caracter === '"') enComillas = true;
    else if (caracter === ",") {
      fila.push(campo);
      campo = "";
    } else if (caracter === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else if (caracter !== "\r") {
      campo += caracter;
    }
  }

  fila.push(campo);
  filas.push(fila);

  return filas;
}

function esActivo(valor?: string) {
  const normalizado = normalizar(valor ?? "");
  if (!normalizado) return true; // celda vacía = activo
  return !VALORES_INACTIVOS.has(normalizado);
}

function filasAOpciones(filas: string[][]): OpcionProductor[] {
  if (filas.length === 0) return [];

  const cabecera = filas[0].map(normalizar);
  const columnaValor = cabecera.findIndex((celda) => celda.startsWith("productor"));
  const tieneCabecera = columnaValor !== -1;
  const columnaActivo = tieneCabecera
    ? cabecera.findIndex((celda) => celda.startsWith("activo"))
    : -1;

  const cuerpo = tieneCabecera ? filas.slice(1) : filas;
  const vistos = new Set<string>();
  const opciones: OpcionProductor[] = [];

  for (const fila of cuerpo) {
    const valor = (fila[tieneCabecera ? columnaValor : 0] ?? "").trim();
    if (!valor) continue;
    if (columnaActivo !== -1 && !esActivo(fila[columnaActivo])) continue;

    const clave = valor.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    // Se respeta el orden de la planilla: mover una fila arriba la fija arriba en el buscador
    opciones.push({ value: valor, label: valor });
  }

  return opciones;
}

export async function getProductores(): Promise<OpcionProductor[]> {
  const sheet = parsearSheet(process.env.GOOGLE_SHEET_PRODUCTORES);
  if (!sheet) {
    console.warn("[productores] GOOGLE_SHEET_PRODUCTORES sin definir, uso respaldo");
    return productoresRespaldo;
  }

  try {
    // Sin cache: cada visita lee la planilla, los cambios se ven al instante
    const respuesta = await fetch(construirUrl(sheet), {
      cache: "no-store",
    });

    if (!respuesta.ok) throw new Error(`Google respondio ${respuesta.status}`);

    const texto = await respuesta.text();

    // Si la planilla no es pública, Google devuelve el HTML del login con status 200
    if (texto.trimStart().startsWith("<")) {
      throw new Error("La planilla no es accesible sin iniciar sesion");
    }

    const opciones = filasAOpciones(parsearCsv(texto));
    if (opciones.length === 0) throw new Error("La planilla no devolvio filas");

    return opciones;
  } catch (error) {
    console.error("[productores] uso lista de respaldo:", error);
    return productoresRespaldo;
  }
}
