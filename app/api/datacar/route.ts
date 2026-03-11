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

    const url = `https://api.datacar.com.ar/vehicle/${patente}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization:
          "Basic Y2Vicm9rZXJzOnNHS29GVCNYMFIqUkV0Z1RhYmhJbHhtODdWNm5FUFRKT3poQzBLQkQ5b3ltNEx0MmZh",
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

    const vehicle = result.data.id;

    return NextResponse.json({
      marca: vehicle.brand,
      modelo: vehicle.model,
      version: vehicle.type,
      anio: vehicle.year,
      motor: "",
      chasis: "",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}