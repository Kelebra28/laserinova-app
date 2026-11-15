import { Briefcase, Receipt, Scale, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import KpiCard from "@/components/ui/molecules/KpiCard";
import TrendBadge from "@/components/ui/atoms/TrendBadge";
import { CHART_COLORS } from "@/constants/dashboard.constants";
import { FINANCE_COMPARISON_LABEL, FINANCE_TAX_LABEL } from "@/constants/finance.constants";
import { formatMoney, formatPercent } from "@/constants/formatters.constants";
import type { FinanceOverview } from "@/types/finance";

type Props = Pick<FinanceOverview, "kpis" | "changes" | "spark" | "activeProjects">;

const DETAIL = "text-[11px] text-gray-400 mt-0.5 block";

/** Los seis números del mes: ingresos, gastos, utilidades, IVA y proyectos en seguimiento. */
export default function FinanceKpiRow({ kpis, changes, spark, activeProjects }: Props) {
  const vs = FINANCE_COMPARISON_LABEL;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
      <KpiCard label="Ingresos cobrados" value={formatMoney(kpis.income, 2)} icon={Wallet} tone="text-emerald-500" spark={spark.income} sparkColor={CHART_COLORS.income}>
        <TrendBadge value={changes.income} label={vs} />
        <span className={DETAIL}>Anticipos + liquidaciones + ingresos</span>
      </KpiCard>
      <KpiCard label="Gastos totales" value={formatMoney(kpis.totalExpenses, 2)} icon={TrendingDown} tone="text-red-500" spark={spark.expense} sparkColor={CHART_COLORS.expense}>
        <TrendBadge value={changes.expenses} label={vs} inverse />
        <span className={DETAIL}>
          Operativos {formatMoney(kpis.opExpenses)} · proyectos {formatMoney(kpis.projectCosts)}
        </span>
      </KpiCard>
      <KpiCard label="Utilidad bruta" value={formatMoney(kpis.grossProfit, 2)} icon={TrendingUp} tone={kpis.grossProfit >= 0 ? "text-emerald-500" : "text-red-500"}>
        <span className="text-xs text-gray-500">Margen {formatPercent(kpis.grossMargin, 1)}</span>
        <span className={DETAIL}>Ingresos − costos de proyectos</span>
      </KpiCard>
      <KpiCard label="Utilidad neta" value={formatMoney(kpis.netProfit, 2)} icon={Scale} tone={kpis.netProfit >= 0 ? "text-emerald-500" : "text-red-500"} spark={spark.net} sparkColor={CHART_COLORS.profitLine}>
        <TrendBadge value={changes.netProfit} label={vs} />
        <span className={DETAIL}>Bruta − gastos operativos</span>
      </KpiCard>
      <KpiCard label="IVA por pagar" value={formatMoney(kpis.taxCollected, 2)} icon={Receipt} tone="text-amber-500">
        <span className="text-xs text-gray-500">{FINANCE_TAX_LABEL}</span>
      </KpiCard>
      <KpiCard label="Proyectos activos" value={String(activeProjects)} icon={Briefcase} tone="text-gray-700" href="/dashboard/quotes">
        <span className="text-xs text-gray-500">Cotizaciones en seguimiento</span>
      </KpiCard>
    </div>
  );
}
