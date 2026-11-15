import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BankOverviewClient from "@/components/finance/overview/BankOverviewClient";
import { requireAdminPage } from "@/lib/auth-guards";

export const metadata = { title: "Panorama bancario | CRM Laser Inova" };

export default async function BankOverviewPage() {
  await requireAdminPage(); // solo ADMIN (el middleware ya redirige; esto protege la página por sí sola)
  return (
    <div className="space-y-6 max-w-7xl pb-20 animate-in fade-in duration-500">
      <div>
        <Link href="/dashboard/finance" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Finanzas
        </Link>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Panorama <span className="text-red-600">bancario</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">Ingresos, egresos y saldo de varios estados de cuenta juntos, comprobados contra lo que imprime el banco.</p>
      </div>
      <BankOverviewClient />
    </div>
  );
}
