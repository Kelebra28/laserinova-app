import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReconciliationClient from "@/components/finance/reconciliation/ReconciliationClient";
import { requireAdminPage } from "@/lib/auth-guards";
import { listStatementsService } from "@/server/services/bank-statement.service";

export const metadata = { title: "Conciliación bancaria | CRM Laser Inova" };

export default async function ReconciliationPage() {
  await requireAdminPage(); // solo ADMIN (el middleware ya redirige; esto protege la página por sí sola)
  const stored = await listStatementsService();
  return (
    <div className="space-y-6 max-w-7xl pb-20 animate-in fade-in duration-500">
      <div>
        <Link href="/dashboard/finance" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Finanzas
        </Link>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Conciliación <span className="text-red-600">bancaria</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Compara tu estado de cuenta contra lo registrado en el sistema y encuentra lo que no cuadra.{" "}
          <Link href="/dashboard/finance/panorama" className="font-bold text-gray-900 underline-offset-4 hover:underline">
            Ver el panorama de varios meses →
          </Link>
        </p>
      </div>
      <ReconciliationClient stored={stored} />
    </div>
  );
}
