import { NextResponse } from "next/server";
import { upsertHubspotLead } from "@/lib/hubspot";

function validarLead(data: any) {
  const errores: string[] = [];

  if (!data.nombreCompleto?.trim()) errores.push("nombreCompleto es obligatorio");
  if (!data.provincia?.trim()) errores.push("provincia es obligatoria");
  if (!data.localidad?.trim()) errores.push("localidad es obligatoria");
  if (!data.codigoPostal?.trim()) errores.push("codigoPostal es obligatorio");
  if (!data.riesgo?.trim()) errores.push("riesgo es obligatorio");
  if (!data.vendedor?.trim()) errores.push("vendedor es obligatorio");
  if (!data.productorAgencia?.trim()) errores.push("productorAgencia es obligatorio");

  if (!data.email?.trim() && !data.celular?.trim()) {
    errores.push("email o celular es obligatorio");
  }

  if (data.esPrendado && !data.fechaFinPrenda?.trim()) {
    errores.push("fechaFinPrenda es obligatoria si es prendado");
  }

  return errores;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("BODY RECIBIDO:", body);

    const errores = validarLead(body);

    if (errores.length > 0) {
      console.log("ERRORES VALIDACION:", errores);

      return NextResponse.json(
        {
          success: false,
          error: "Validación fallida",
          details: errores,
        },
        { status: 400 }
      );
    }

    const hubspotResult = await upsertHubspotLead(body);
    console.log("RESPUESTA HUBSPOT:", hubspotResult);

    return NextResponse.json({
      success: true,
      hubspotId: hubspotResult?.id ?? null,
    });
  } catch (error: any) {
    console.error("ERROR EN /api/leads:", error);
    console.error("ERROR DETALLE:", error?.response?.body || error?.message || error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Error interno",
        detail: error?.response?.body || null,
      },
      { status: 500 }
    );
  }
}