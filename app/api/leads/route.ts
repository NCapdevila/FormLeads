import { NextResponse } from "next/server";

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

    const errores = validarLead(body);

    if (errores.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validación fallida",
          details: errores,
        },
        { status: 400 }
      );
    }

    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || "no encontrada";

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      redirect: "follow",
    });

    const text = await response.text();

    return NextResponse.json({
      success: response.ok,
      googleResponse: text,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 500 }
    );
  }
}