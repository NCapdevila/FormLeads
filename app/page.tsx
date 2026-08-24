import LeadsWorkspace from "@/components/LeadsWorkspace";
import { getProductores } from "@/lib/productoresSheet";

// Sin prerender: la lista de productores se lee en cada request
export const dynamic = "force-dynamic";

export default async function Home() {
  const productores = await getProductores();

  return (
    <main className="page-shell min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <LeadsWorkspace productores={productores} />
      </div>
    </main>
  );
}
