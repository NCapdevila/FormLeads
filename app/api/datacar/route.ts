import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patente } = body;

    if (!patente) {
      return NextResponse.json(
        { error: "Patente requerida" },
        { status: 400 }
      );
    }
    const urlData = process.env.DATACAR_URL
    const url = `${urlData}/vehicle/${patente}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: process.env.DATACAR_AUTH as string,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Error consultando DataCar" },
        { status: 500 }
      );
    }

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        { error: "Vehículo no encontrado" },
        { status: 404 }
      );
    }

    const vehicle = result.data;

    return NextResponse.json({
      marca: vehicle.id.brand,
      modelo: vehicle.id.model,
      version: vehicle.id.type,
      anio: vehicle.id.year,
      motor: vehicle.num?.engine,
      chasis: vehicle.num?.chassis,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}