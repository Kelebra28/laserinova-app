import { PiggyBank, Scale, TrendingDown, TrendingUp } from "lucide-react";
import KpiCard from "@/components/ui/molecules/KpiCard";
import { formatMoney, formatShortDate } from "@/constants/formatters.constants";
import type { OverviewTotals } from "@/types/bank-overview";

type Props = { totals: OverviewTotals; excludedCount: number };

/** Las cuatro cifras de arriba: ingresos, egresos, flujo neto y saldo al cierre. */
export default function OverviewKpiRow({ totals: t, excludedCount }: Props) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard label="Ingresos" value={formatMoney(t.income, 2)} icon={TrendingUp} tone="text-emerald-500">
        {excludedCount > 0 && <span className="text-xs text-gray-500">Sin {excludedCount} transferencia{excludedCount === 1 ? "" : "s"} entre cuentas propias</span>}
      </KpiCard>
      <KpiCard label="Egresos" value={formatMoney(t.expense, 2)} icon={TrendingDown} tone="text-red-500" />
      <KpiCard label="Flujo neto" value={formatMoney(t.net, 2)} icon={Scale} tone={t.net >= 0 ? "text-emerald-500" : "text-red-500"}>
        <span className="text-xs text-gray-500">Ingresos − egresos</span>
      </KpiCard>
      <KpiCard label="Saldo al cierre" value={t.closingBalance === null ? "—" : formatMoney(t.closingBalance, 2)} icon={PiggyBank} tone="text-gray-700">
        <span className="text-xs text-gray-500">{t.closingDate ? `Al ${formatShortDate(t.closingDate)}, según el último estado` : "Sin estados"}</span>
      </KpiCard>
    </div>
  );
}
