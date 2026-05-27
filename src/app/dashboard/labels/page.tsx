import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { Printer } from "lucide-react";
import LabelGeneratorClient from "./LabelGeneratorClient";

export default async function LabelsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md">
          <Printer className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Generador de Etiquetas</h1>
          <p className="text-xs text-gray-400 mt-0.5">Crea etiquetas de envío para plotters y cama plana</p>
        </div>
      </div>

      <LabelGeneratorClient />
    </div>
  );
}
