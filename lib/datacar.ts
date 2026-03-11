export async function consultarPatente(patente: string) {
  const response = await fetch("/api/datacar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ patente }),
  });

  if (!response.ok) {
    throw new Error("Error consultando patente");
  }

  return response.json();
}