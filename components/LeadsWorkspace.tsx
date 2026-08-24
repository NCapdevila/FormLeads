"use client";

import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import { Inbox } from "lucide-react";

import LeadForm from "@/components/LeadForm";
import PrecargasModal from "@/components/PrecargasModal";
import { contarPendientes, precargaAFormulario, tituloPrecarga } from "@/lib/precargas";
import type { Precarga } from "@/types/precarga";

interface Props {
  productores: { value: string; label: string }[];
}

export default function LeadsWorkspace({ productores }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [precarga, setPrecarga] = useState<Precarga | null>(null);
  const [pendientes, setPendientes] = useState<number | null>(null);

  // En un ref y no en estado: sólo decide si vale la pena consultar, no se
  // dibuja, así que no hace falta re-renderizar cuando cambia.
  const sesionRef = useRef(false);

  const mapeada = useMemo(
    () => (precarga ? precargaAFormulario(precarga) : null),
    [precarga]
  );

  const refrescarPendientes = useCallback(async () => {
    if (!sesionRef.current) return;
    try {
      setPendientes(await contarPendientes());
    } catch (e) {
      console.error("No se pudo contar las pre-cargas pendientes:", e);
      setPendientes(null);
    }
  }, []);

  // Estable: el modal la llama desde un useEffect.
  const onSesionCambio = useCallback(
    (sesion: boolean) => {
      sesionRef.current = sesion;
      if (sesion) refrescarPendientes();
      else setPendientes(null);
    },
    [refrescarPendientes]
  );

  const elegirPrecarga = (p: Precarga) => {
    setPrecarga(p);
    // El form está más abajo: lo traemos a la vista.
    requestAnimationFrame(() => {
      document
        .getElementById("form-lead")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <>
      <div className="mb-8">
        <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-4">
          {/* Izquierda, a la altura del logo */}
          <div className="md:justify-self-start">
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="link-precargas"
            >
              <Inbox size={16} />
              Pre-cargas
              {pendientes !== null && pendientes > 0 && (
                <span className="rounded-full bg-(--color-brand) px-2 py-0.5 text-xs font-bold text-white">
                  {pendientes}
                </span>
              )}
            </button>
          </div>

          {/* Centro */}
          <div className="flex justify-center">
            <Image
              src="/logo-cebrokers.png"
              alt="CEBrokers"
              width={320}
              height={90}
              priority
              className="h-auto w-220px md:w-[320px]"
            />
          </div>

          {/* Derecha: espaciador, para que el logo quede centrado de verdad */}
          <div className="hidden md:block" />
        </div>

        <p className="mt-2 text-center text-sm text-gray-500 md:text-base">
          Carga de leads
        </p>
      </div>

      <div id="form-lead" className="section-card scroll-mt-6">
        <LeadForm
          // Remontar el form al cambiar de pre-carga: así los valores nuevos
          // entran como estado inicial y no hay que sincronizar nada.
          key={precarga?.id ?? "vacio"}
          productores={productores}
          initialValues={mapeada?.valores}
          camposDudosos={mapeada?.camposDudosos}
          notas={mapeada?.notas}
          precargaId={precarga?.id}
          precargaTitulo={precarga ? tituloPrecarga(precarga) : undefined}
          onDesvincularPrecarga={() => setPrecarga(null)}
          onLeadGuardado={() => {
            setPrecarga(null);
            refrescarPendientes();
          }}
        />
      </div>

      <PrecargasModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSeleccionar={elegirPrecarga}
        onSesionCambio={onSesionCambio}
      />
    </>
  );
}
