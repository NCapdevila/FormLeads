import Image from "next/image";
import LeadForm from "@/components/LeadForm";

export default function Home() {
  return (
    <main className="page-shell min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Image
            src="/logo-cebrokers.png"
            alt="CEBrokers"
            width={320}
            height={90}
            priority
            className="h-auto w-220px md:w-[320px]"
          />

          <div>
            <p className="mt-2 text-sm text-gray-500 md:text-base">
              Carga de leads
            </p>
          </div>
        </div>

        <div className="section-card">
          <LeadForm />
        </div>
      </div>
    </main>
  );
}