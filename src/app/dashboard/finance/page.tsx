import Link from "next/link";
import { BarChart3, Landmark, LineChart } from "lucide-react";
import TransactionForm from "@/components/finance/TransactionForm";
import TransactionTable from "@/components/finance/TransactionTable";
import PaymentBoard from "@/components/finance/PaymentBoard";
import { HistoryFilter } from "@/components/finance/HistoryFilter";
import FinanceHeader from "@/components/finance/organisms/FinanceHeader";
import FinanceKpiRow from "@/components/finance/organisms/FinanceKpiRow";
import DailyFlowCard from "@/components/finance/organisms/DailyFlowCard";
import ExpenseBreakdownCard from "@/components/finance/organisms/ExpenseBreakdownCard";
import FinanceSection from "@/components/finance/sections/FinanceSection";
import { getFinanceOverviewService } from "@/server/services/finance.service";
import { requireAdminPage } from "@/lib/auth-guards";

// Los datos son siempre en vivo: sin prerender estático.
export const dynamic = "force-dynamic";

/** Página delgada: lee el mes de la URL, pide los datos al servicio y arma las piezas. */
export default async function FinancePage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  await requireAdminPage(); // solo ADMIN: nada de datos financieros se consulta antes de validar el rol
  const params = await searchParams;
  const now = new Date();
  const month = params.month ? parseInt(params.month, 10) : now.getMonth();
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();

  const f = await getFinanceOverviewService(year, month);

  return (
    <div className="space-y-6 max-w-7xl pb-20 animate-in fade-in duration-500">
      <FinanceHeader
        monthLabel={f.monthLabel}
        filter={<HistoryFilter basePath="/dashboard/finance" currentMonth={month} currentYear={year} />}
        actions={
          <>
            <Link
              href="/dashboard/finance/history"
              className="inline-flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Reportes / Historial
            </Link>
            <Link
              href="/dashboard/finance/reconciliation"
              className="inline-flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
            >
              <Landmark className="h-4 w-4" />
              Conciliación bancaria
            </Link>
            <Link
              href="/dashboard/finance/panorama"
              className="inline-flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
            >
              <LineChart className="h-4 w-4" />
              Panorama bancario
            </Link>
            <TransactionForm quotes={f.quotes} clients={f.clients} />
          </>
        }
      />

      <FinanceKpiRow kpis={f.kpis} changes={f.changes} spark={f.spark} activeProjects={f.activeProjects} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <DailyFlowCard daily={f.daily} income={f.kpis.income} expenses={f.kpis.totalExpenses} />
        </div>
        <ExpenseBreakdownCard breakdown={f.breakdown} />
      </div>

      <FinanceSection title="Seguimiento de cobros" accent="bg-emerald-600" count={`${f.activeProjects} proyectos activos`}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
          <PaymentBoard initialQuotes={f.collectionQuotes} initialPaidQuotes={f.fullyPaidQuotes} />
        </div>
      </FinanceSection>

      <FinanceSection title="Movimientos del mes" accent="bg-gray-900" count={`${f.movements.length} registros`}>
        <TransactionTable transactions={f.movements} quotes={f.quotes} clients={f.clients} />
      </FinanceSection>
    </div>
  );
}
