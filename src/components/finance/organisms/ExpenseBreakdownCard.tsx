import Panel from "@/components/ui/atoms/Panel";
import RankedRow from "@/components/ui/molecules/RankedRow";
import { EmptyState } from "@/components/ui/atoms/EmptyState";
import { FINANCE_BREAKDOWN_TOP } from "@/constants/finance.constants";
import { formatMoney } from "@/constants/formatters.constants";
import type { FinanceOverview } from "@/types/finance";

type Props = { breakdown: FinanceOverview["breakdown"] };

/** En qué categorías se fue el gasto del mes. */
export default function ExpenseBreakdownCard({ breakdown }: Props) {
  const shown = breakdown.slice(0, FINANCE_BREAKDOWN_TOP);
  const rest = breakdown.length - shown.length;
  const max = Math.max(...shown.map((b) => b.amount), 1);
  return (
    <Panel title="En qué se va el dinero" subtitle="Gastos del mes por categoría" className="h-full">
      {shown.length === 0 ? (
        <EmptyState text="Sin gastos registrados este mes" />
      ) : (
        <>
          <ul className="space-y-3">
            {shown.map((b) => (
              <RankedRow key={b.category} label={b.category} sub={`${b.share.toFixed(0)}% del gasto`} valueLabel={formatMoney(b.amount)} percent={(b.amount / max) * 100} />
            ))}
          </ul>
          {rest > 0 && <p className="mt-3 text-[11px] text-gray-400">y {rest} categoría{rest === 1 ? "" : "s"} más</p>}
        </>
      )}
    </Panel>
  );
}
