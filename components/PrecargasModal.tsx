"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Inbox,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { supabase, supabaseConfigurado } from "@/lib/supabase";
import {
  ETIQUETAS,
  MAPA_CAMPOS,
  listarPendientes,
  precargaAFormulario,
  tituloPrecarga,
} from "@/lib/precargas";
import type { Precarga } from "@/types/precarga";
import type { LeadFormData } from "@/types/lead";

interface Props {
  open: boolean;
  onClose: () => void;
  onSeleccionar: (precarga: Precarga) => void;
  onSesionCambio?: (haySesion: boolean) => void;
}

const COLOR_RIESGO: Record<string, string> = {
  
};

function BadgeRiesgo({ riesgo }: { riesgo: Precarga["riesgo"] }) {
  const clase =
    COLOR_RIESGO[riesgo ?? ""] ?? "bg-slate-100 text-slate-500 border-slate-200";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${clase}`}>
      {riesgo ?? "sin riesgo"}
    </span>
  );
}

function fechaCorta(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const BORDE = "rgba(14,32,108,0.08)";

export default function PrecargasModal({
  open,
  onClose,
  onSeleccionar,
  onSesionCambio,
}: Props) {
  const [haySesion, setHaySesion] = useState<boolean | null>(null);
  const [precargas, setPrecargas] = useState<Precarga[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionada, setSeleccionada] = useState<Precarga | null>(null);

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [errorLogin, setErrorLogin] = useState("");
  const [saliendo, setSaliendo] = useState(false);

  // La sesión se lee del storage y después escuchamos cualquier cambio.
  useEffect(() => {
    if (!supabaseConfigurado) {
      setHaySesion(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setHaySesion(Boolean(data.session));
      onSesionCambio?.(Boolean(data.session));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, session) => {
      setHaySesion(Boolean(session));
      onSesionCambio?.(Boolean(session));
    });

    return () => sub.subscription.unsubscribe();
  }, [onSesionCambio]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setPrecargas(await listarPendientes());
    } catch (e) {
      console.error(e);
      setError("No se pudieron traer las pre-cargas.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (open && haySesion) cargar();
  }, [open, haySesion, cargar]);

  // Al cerrar reseteamos, así la próxima apertura arranca en la lista.
  useEffect(() => {
    if (!open) {
      setSeleccionada(null);
      setBusqueda("");
      setErrorLogin("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return precargas;
    return precargas.filter((p) => tituloPrecarga(p).toLowerCase().includes(q));
  }, [precargas, busqueda]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntrando(true);
    setErrorLogin("");
    try {
      const { error: errorAuth } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (errorAuth) {
        setErrorLogin("Usuario o contraseña incorrectos.");
        return;
      }

      setPassword("");
    } catch {
      setErrorLogin("No se pudo conectar con Supabase.");
    } finally {
      setEntrando(false);
    }
  };

  // No tocamos haySesion a mano: signOut dispara onAuthStateChange y ese
  // effect es el único que manda. Acá sólo limpiamos lo que quedó en memoria,
  // para no dejar pre-cargas de la sesión anterior a la vista.
  const handleSalir = async () => {
    setSaliendo(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("No se pudo cerrar la sesión:", e);
    } finally {
      setSaliendo(false);
    }

    setPrecargas([]);
    setSeleccionada(null);
    setBusqueda("");
    setPassword("");
    setError("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <div
          className="flex items-center gap-3 border-b px-5 py-4"
          style={{ borderColor: BORDE }}
        >
          {seleccionada && (
            <button
              type="button"
              onClick={() => setSeleccionada(null)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Volver a la lista"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <h2 className="flex-1 text-base font-bold text-(--color-primary-dark)">
            {seleccionada ? "Detalle de la pre-carga" : "Pre-cargas pendientes"}
          </h2>

          {!seleccionada && haySesion && (
            <button
              type="button"
              onClick={cargar}
              disabled={cargando}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              aria-label="Actualizar"
            >
              <RefreshCw size={16} className={cargando ? "animate-spin" : ""} />
            </button>
          )}

          {haySesion && (
            <button
              type="button"
              onClick={handleSalir}
              disabled={saliendo}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              {saliendo ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogOut size={16} />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {haySesion === null && (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            Verificando sesión...
          </div>
        )}

        {haySesion === false && (
          <LoginPane
            configurado={supabaseConfigurado}
            email={email}
            password={password}
            entrando={entrando}
            error={errorLogin}
            onEmail={setEmail}
            onPassword={setPassword}
            onSubmit={handleLogin}
          />
        )}

        {haySesion && !seleccionada && (
          <ListaPane
            precargas={filtradas}
            total={precargas.length}
            busqueda={busqueda}
            onBusqueda={setBusqueda}
            cargando={cargando}
            error={error}
            onSeleccionar={setSeleccionada}
          />
        )}

        {haySesion && seleccionada && (
          <DetallePane
            precarga={seleccionada}
            onCompletar={() => {
              onSeleccionar(seleccionada);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}

function LoginPane({
  configurado,
  email,
  password,
  entrando,
  error,
  onEmail,
  onPassword,
  onSubmit,
}: {
  configurado: boolean;
  email: string;
  password: string;
  entrando: boolean;
  error: string;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!configurado) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        <Lock size={22} className="mx-auto mb-3 text-slate-400" />
        Falta configurar{" "}
        <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
        <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        en <code className="rounded bg-slate-100 px-1">.env.local</code>.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-6">
      <div className="text-center">
        <Lock size={22} className="mx-auto mb-2 text-slate-400" />
        <p className="text-sm text-slate-500">
          Iniciá sesión para ver las pre-cargas del bot.
        </p>
      </div>

      <input
        type="email"
        value={email}
        onChange={(e) => onEmail(e.target.value)}
        placeholder="Email"
        autoComplete="username"
        required
        className="input"
      />

      <input
        type="password"
        value={password}
        onChange={(e) => onPassword(e.target.value)}
        placeholder="Contraseña"
        autoComplete="current-password"
        required
        className="input"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={entrando}
        className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-70"
      >
        {entrando && <Loader2 size={16} className="animate-spin" />}
        {entrando ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}

function ListaPane({
  precargas,
  total,
  busqueda,
  onBusqueda,
  cargando,
  error,
  onSeleccionar,
}: {
  precargas: Precarga[];
  total: number;
  busqueda: string;
  onBusqueda: (v: string) => void;
  cargando: boolean;
  error: string;
  onSeleccionar: (p: Precarga) => void;
}) {
  return (
    <>
      <div className="border-b px-5 py-3" style={{ borderColor: BORDE }}>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            placeholder="Buscar por concesionaria, riesgo, patente o email..."
            className="input input-busqueda"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {cargando && (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            Cargando...
          </div>
        )}

        {!cargando && error && (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        )}

        {!cargando && !error && precargas.length === 0 && (
          <div className="p-10 text-center text-sm text-slate-500">
            <Inbox size={22} className="mx-auto mb-3 text-slate-400" />
            {total === 0
              ? "No hay pre-cargas pendientes."
              : "Ninguna pre-carga coincide con la búsqueda."}
          </div>
        )}

        {!cargando && !error && precargas.length > 0 && (
          <ul className="divide-y" style={{ borderColor: BORDE }}>
            {precargas.map((p) => {
              const dudosos = p.campos_dudosos ?? [];

              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSeleccionar(p)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50"
                  >
                    <BadgeRiesgo riesgo={p.riesgo} />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-(--color-primary-dark)">
                        {tituloPrecarga(p)}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {fechaCorta(p.created_at)}
                      </span>
                    </span>

                    {dudosos.length > 0 && (
                      <span
                        className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                        title={`Campos dudosos: ${dudosos.join(", ")}`}
                      >
                        <AlertTriangle size={13} />
                        {dudosos.length}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

function DetallePane({
  precarga,
  onCompletar,
}: {
  precarga: Precarga;
  onCompletar: () => void;
}) {
  const { camposDudosos, notas } = precargaAFormulario(precarga);

  // Los campos dudosos no se marcan uno por uno: se listan acá arriba y listo.
  // Se suman los que el bot marcó pero no existen en el form, así no se pierden.
  const listaDudosos = [
    ...camposDudosos.map((campo) => ETIQUETAS[campo] ?? campo),
    ...(precarga.campos_dudosos ?? []).filter((c) => !MAPA_CAMPOS[c]),
  ].join(", ");

  const listaNotas = Object.values(notas).filter(Boolean) as string[];

  const booleano = (v: boolean | null) =>
    v === null ? "sin dato" : v ? "Sí" : "No";

  const secciones: {
    titulo: string;
    filas: { campo: keyof LeadFormData; valor: string | null }[];
  }[] = [
    {
      titulo: "Persona",
      filas: [
        { campo: "nombre", valor: precarga.nombre },
        { campo: "apellido", valor: precarga.apellido },
        { campo: "dni", valor: precarga.dni },
        { campo: "fechaNacimiento", valor: precarga.fecha_nacimiento },
        { campo: "email", valor: precarga.email },
        { campo: "celular", valor: precarga.celular },
      ],
    },
    {
      titulo: "Ubicación",
      filas: [
        { campo: "provincia", valor: precarga.provincia },
        { campo: "localidad", valor: precarga.localidad },
        { campo: "codigoPostal", valor: precarga.codigo_postal },
      ],
    },
    {
      titulo: "Vehículo",
      filas: [
        { campo: "riesgo", valor: precarga.riesgo },
        { campo: "patente", valor: precarga.patente },
        { campo: "marca", valor: precarga.marca },
        { campo: "modelo", valor: precarga.modelo },
        { campo: "version", valor: precarga.version },
        { campo: "anio", valor: precarga.anio },
        { campo: "motor", valor: precarga.motor },
        { campo: "chasis", valor: precarga.chasis },
        { campo: "es0km", valor: booleano(precarga.es_0km) },
        { campo: "esPrendado", valor: booleano(precarga.es_prendado) },
        { campo: "fechaFinPrenda", valor: precarga.fecha_fin_prenda },
      ],
    },
  ];

  const porcentaje = (v: number | null) =>
    v === null ? "—" : `${Math.round(v * 100)}%`;

  return (
    <>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="flex flex-wrap items-center gap-2">
          <BadgeRiesgo riesgo={precarga.riesgo} />
          <span className="text-sm font-semibold text-(--color-primary-dark)">
            {precarga.concesionaria || "sin concesionaria"}
          </span>
          <span className="text-xs text-slate-400">
            {fechaCorta(precarga.created_at)}
          </span>
        </div>

        {(listaDudosos || listaNotas.length > 0) && (
          <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />

            <div className="space-y-1">
              {listaDudosos && (
                <p>
                  El bot no leyó con certeza, o dos mensajes se contradijeron:{" "}
                  <strong>{listaDudosos}</strong>.
                </p>
              )}

              {listaNotas.map((nota) => (
                <p key={nota}>{nota}</p>
              ))}
            </div>
          </div>
        )}

        {secciones.map((seccion) => {
          const filas = seccion.filas.filter((f) => f.valor);
          if (filas.length === 0) return null;

          return (
            <div key={seccion.titulo} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {seccion.titulo}
              </h3>

              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filas.map(({ campo, valor }) => (
                  <div
                    key={campo}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <dt className="text-xs text-slate-500">
                      {ETIQUETAS[campo] ?? campo}
                    </dt>
                    <dd className="text-sm font-medium break-words text-(--color-primary-dark)">
                      {valor}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}

        <div
          className="space-y-1 border-t pt-3 text-xs text-slate-400"
          style={{ borderColor: BORDE }}
        >
          <p>
            Confianza de la extracción: {porcentaje(precarga.confianza)} · Confianza
            del riesgo: {porcentaje(precarga.riesgo_confianza)}
          </p>
          {precarga.modelo_usado && <p>Modelo: {precarga.modelo_usado}</p>}
        </div>
      </div>

      <div className="border-t px-5 py-4" style={{ borderColor: BORDE }}>
        <button type="button" onClick={onCompletar} className="btn-primary w-full">
          Completar formulario
        </button>
        <p className="mt-2 text-center text-xs text-slate-400">
          La pre-carga se marca como cargada recién cuando el lead se guarda bien.
        </p>
      </div>
    </>
  );
}
