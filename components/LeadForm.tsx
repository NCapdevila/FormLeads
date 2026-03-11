"use client";

import { useState } from "react";
import {
  User,
  MapPin,
  Car,
  Briefcase
} from "lucide-react";

import SearchSelect from "@/components/SearchSelect";
import { vendedores, productores } from "@/lib/catalogos";
import { consultarPatente } from "@/lib/datacar";

export default function LeadForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consultandoPatente, setConsultandoPatente] = useState(false);
  const [guardandoLead, setGuardandoLead] = useState(false);
  const [toast, setToast] = useState<{
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
}>({
  open: false,
  type: "success",
  title: "",
  message: "",
});

const showToast = (
  type: "success" | "error",
  title: string,
  message: string
) => {
  setToast({
    open: true,
    type,
    title,
    message,
  });

  setTimeout(() => {
    setToast((prev) => ({
      ...prev,
      open: false,
    }));
  }, 3500);
};

  const [formData, setFormData] = useState({
    nombreCompleto: "",
    fechaNacimiento: "",
    provincia: "",
    localidad: "",
    codigoPostal: "",
    email: "",
    celular: "",
    riesgo: "",
    patente: "",
    marca: "",
    modelo: "",
    version: "",
    anio: "",
    es0km: false,
    esPrendado: false,
    fechaFinPrenda: "",
    vendedor: "",
    productorAgencia: ""
  });

  const showVehicleFields =
    formData.riesgo === "AUTO" ||
    formData.riesgo === "MOTO";

    const limpiarDatosVehiculo = (data: typeof formData) => ({
  ...data,
  patente: "",
  marca: "",
  modelo: "",
  version: "",
  anio: "",
  es0km: false,
  esPrendado: false,
  fechaFinPrenda: "",
});

const validarFormulario = () => {
  const nuevosErrores: Record<string, string> = {};

  if (!formData.nombreCompleto.trim()) {
    nuevosErrores.nombreCompleto = "Ingresá el nombre completo";
  }

  if (!formData.provincia.trim()) {
    nuevosErrores.provincia = "Ingresá la provincia";
  }

  if (!formData.localidad.trim()) {
    nuevosErrores.localidad = "Ingresá la localidad";
  }

  if (!formData.codigoPostal.trim()) {
    nuevosErrores.codigoPostal = "Ingresá el código postal";
  }

  if (!formData.riesgo.trim()) {
    nuevosErrores.riesgo = "Seleccioná el riesgo";
  }

  if (!formData.vendedor.trim()) {
    nuevosErrores.vendedor = "Seleccioná un vendedor";
  }

  if (!formData.productorAgencia.trim()) {
    nuevosErrores.productorAgencia = "Seleccioná productor o agencia";
  }

  if (!formData.email.trim() && !formData.celular.trim()) {
    nuevosErrores.email = "Ingresá email o celular";
    nuevosErrores.celular = "Ingresá email o celular";
  }

  if (formData.esPrendado && !formData.fechaFinPrenda.trim()) {
    nuevosErrores.fechaFinPrenda = "Ingresá la fecha fin de prenda";
  }

  setErrors(nuevosErrores);

  return nuevosErrores;
};

const irAlPrimerError = (nuevosErrores: Record<string, string>) => {
  const primerCampo = Object.keys(nuevosErrores)[0];
  if (!primerCampo) return;

  const elemento = document.querySelector(
    `[name="${primerCampo}"]`
  ) as HTMLElement | null;

  if (elemento) {
    elemento.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    if ("focus" in elemento) {
      elemento.focus();
    }
  }
};



  const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
) => {
  const { name, value, type } = e.target;
  const checked =
    type === "checkbox" && "checked" in e.target ? e.target.checked : false;

  setFormData((prev) => {
    let updated = {
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    };

    if (name === "esPrendado" && !checked) {
      updated.fechaFinPrenda = "";
    }

    if (name === "riesgo" && value !== prev.riesgo) {
      updated = limpiarDatosVehiculo(updated);
    }

    return updated;
  });

  setErrors((prev) => {
    const nextErrors = {
      ...prev,
      [name]: "",
    };

    // Si cambia email o celular, limpiar ambos errores
    if (name === "email" || name === "celular") {
      nextErrors.email = "";
      nextErrors.celular = "";
    }

    // Si deja de ser prendado, limpiar error de fecha
    if (name === "esPrendado" && !checked) {
      nextErrors.fechaFinPrenda = "";
    }

    // Si cambia el riesgo, limpiar errores del bloque vehículo
    if (name === "riesgo") {
      nextErrors.riesgo = "";
      nextErrors.patente = "";
      nextErrors.marca = "";
      nextErrors.modelo = "";
      nextErrors.version = "";
      nextErrors.anio = "";
      nextErrors.fechaFinPrenda = "";
    }

    return nextErrors;
  });
};
  const handleConsultarPatente = async () => {
  if (!formData.patente) {
    alert("Ingresá una patente");
    return;
  }

  try {
    setConsultandoPatente(true);

    const data = await consultarPatente(formData.patente);

    setFormData((prev) => ({
      ...prev,
      marca: data.marca || "",
      modelo: data.modelo || "",
      version: data.version || "",
      anio: data.anio || "",
    }));
  } catch (error) {
    alert("No se pudo consultar la patente");
  } finally {
    setConsultandoPatente(false);
  }
};

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const nuevosErrores = validarFormulario();

  if (Object.keys(nuevosErrores).length > 0) {
    showToast(
      "error",
      "Revisá el formulario",
      "Hay campos obligatorios sin completar."
    );
    irAlPrimerError(nuevosErrores);
    return;
  }

  try {
    setGuardandoLead(true);

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error(result);

      const backendMessage =
        Array.isArray(result?.details) && result.details.length > 0
          ? result.details[0]
          : result?.error || "Ocurrió un problema al guardar el lead.";

      showToast(
        "error",
        "No se pudo guardar",
        backendMessage
      );
      return;
    }

    showToast(
      "success",
      "Lead guardado",
      "El lead se guardó correctamente."
    );

    setFormData({
      nombreCompleto: "",
      fechaNacimiento: "",
      provincia: "",
      localidad: "",
      codigoPostal: "",
      email: "",
      celular: "",
      riesgo: "",
      patente: "",
      marca: "",
      modelo: "",
      version: "",
      anio: "",
      es0km: false,
      esPrendado: false,
      fechaFinPrenda: "",
      vendedor: "",
      productorAgencia: "",
    });

    setErrors({});
  } catch (error) {
    console.error(error);

    showToast(
      "error",
      "Error inesperado",
      "Hubo un error al intentar guardar el lead."
    );
  } finally {
    setGuardandoLead(false);
  }
};
  return (

    <form
      onSubmit={handleSubmit}
      className="space-y-10"
    >

      {/* CLIENTE */}

      <section className="space-y-6">

        <div className="flex items-center gap-2">
          <User size={18} />
          <h2 className="font-semibold text-gray-700">
            Datos del Cliente
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <input
            name="nombreCompleto"
            placeholder="Nombre Completo"
            value={formData.nombreCompleto}
            onChange={handleChange}
            className="input"
          />

         <input
  type="date"
  name="fechaNacimiento"
  value={formData.fechaNacimiento}
  onChange={handleChange}
  placeholder="Fecha de nacimiento"
  className="input"
/>

          <input
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="input"
          />

          <input
            name="celular"
            placeholder="Celular"
            value={formData.celular}
            onChange={handleChange}
            className="input"
          />

        </div>

      </section>

      {/* UBICACION */}

      <section className="space-y-6">

        <div className="flex items-center gap-2">
          <MapPin size={18} />
          <h2 className="font-semibold text-gray-700">
            Ubicación
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <input
            name="provincia"
            placeholder="Provincia"
            value={formData.provincia}
            onChange={handleChange}
            className="input"
          />

          <input
            name="localidad"
            placeholder="Localidad"
            value={formData.localidad}
            onChange={handleChange}
            className="input"
          />

          <input
            name="codigoPostal"
            placeholder="Código Postal"
            value={formData.codigoPostal}
            onChange={handleChange}
            className="input"
          />

        </div>

      </section>

      {/* COMERCIAL */}

      <section className="space-y-6">

        <div className="flex items-center gap-2">
          <Briefcase size={18} />
          <h2 className="font-semibold text-gray-700">
            Gestión Comercial
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <SearchSelect
            options={vendedores}
            value={formData.vendedor}
            placeholder="Buscar vendedor..."
            onChange={(value) =>
              setFormData(prev => ({
                ...prev,
                vendedor: value
              }))
            }
          />

          <SearchSelect
            options={productores}
            value={formData.productorAgencia}
            placeholder="Buscar productor o agencia..."
            onChange={(value) =>
              setFormData(prev => ({
                ...prev,
                productorAgencia: value
              }))
            }
          />

        </div>

      </section>

      {/* RIESGO */}

      <section className="space-y-6">

        <div className="flex items-center gap-2">
          <Car size={18} />
          <h2 className="font-semibold text-gray-700">
            Riesgo
          </h2>
        </div>

        <select
          name="riesgo"
          value={formData.riesgo}
          onChange={handleChange}
          className="input"
        >
          <option value="">Seleccionar riesgo</option>
          <option value="AUTO">Auto</option>
          <option value="MOTO">Moto</option>
        </select>

        {showVehicleFields && (

          <div className="space-y-6 border rounded-xl p-6 bg-gray-50">

            <div className="flex gap-2">

              <input
                name="patente"
                placeholder="Patente"
                value={formData.patente}
                onChange={handleChange}
                className="input"
              />

              <button
  type="button"
  onClick={handleConsultarPatente}
  disabled={consultandoPatente}
  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 transition disabled:cursor-not-allowed disabled:opacity-70"
>
  {consultandoPatente && (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
  )}
  {consultandoPatente ? "Consultando..." : "Consultar"}
</button>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <input
                name="marca"
                placeholder="Marca"
                value={formData.marca}
                onChange={handleChange}
                className="input"
              />

              <input
                name="modelo"
                placeholder="Modelo"
                value={formData.modelo}
                onChange={handleChange}
                className="input"
              />

              <input
                name="version"
                placeholder="Versión"
                value={formData.version}
                onChange={handleChange}
                className="input"
              />

              <input
                name="anio"
                placeholder="Año"
                value={formData.anio}
                onChange={handleChange}
                className="input"
              />

            </div>

            <div className="flex gap-6">

              <label className="flex items-center gap-2">

                <input
                  type="checkbox"
                  name="es0km"
                  checked={formData.es0km}
                  onChange={handleChange}
                />

                0km

              </label>

              <label className="flex items-center gap-2">

                <input
                  type="checkbox"
                  name="esPrendado"
                  checked={formData.esPrendado}
                  onChange={handleChange}
                />

                Prendado

              </label>

            </div>

            {formData.esPrendado && (

              <input
                type="date"
                name="fechaFinPrenda"
                value={formData.fechaFinPrenda}
                onChange={handleChange}
                className="input"
              />

            )}

          </div>

        )}

      </section>
       <div className="flex justify-center pt-4">

  <button
    type="submit"
    disabled={guardandoLead}
    className="rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition btn-primary px-4 py-3 shadow-lg hover:scale-[1.02] flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
  >

    {guardandoLead && (
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
    )}

    {guardandoLead ? "Guardando..." : "Guardar Lead"}

  </button>
  {toast.open && (
  <div className="fixed right-5 top-5 z-50 w-full max-w-sm animate-[slideIn_.25s_ease-out]">
    <div
      className={`rounded-2xl border bg-white p-4 shadow-2xl ${
        toast.type === "success"
          ? "border-(--color-accent)"
          : "border-red-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${
            toast.type === "success"
              ? "bg-(--color-brand)"
              : "bg-red-500"
          }`}
        >
          {toast.type === "success" ? "✓" : "!"}
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-bold text-(--color-primary-dark)">
            {toast.title}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setToast((prev) => ({
              ...prev,
              open: false,
            }))
          }
          className="text-slate-400 transition hover:text-slate-600"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
)}

</div>
    </form>

  );

}