import Panel from "@/components/ui/atoms/Panel";
import RankedRow from "@/components/ui/molecules/RankedRow";
import { EmptyState } from "@/components/ui/atoms/EmptyState";
import { formatMoney } from "@/constants/formatters.constants";
import type { ChargeGroup, ChargesBreakdown } from "@/types/reconciliation";

type Props = { breakdown: ChargesBreakdown };

function Column({ title, groups }: { title: string; groups: ChargeGroup[] }) {
  const max = Math.max(...groups.map((g) => g.amount), 1);
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3">{title}</p>
      <ul className="space-y-3">
        {groups.map((g) => (
          <RankedRow key={g.key} label={g.label} sub={`${g.count} · ${g.share.toFixed(0)}%`} valueLabel={formatMoney(g.amount)} percent={(g.amount / max) * 100} />
        ))}
      </ul>
    </div>
  );
}

/** En qué se fueron los cargos del estado de cuenta, por categoría y por comercio. */
export default function ChargesBreakdownCard({ breakdown: b }: Props) {
  return (
    <Panel title="En qué se fueron los cargos" subtitle={b.count ? `${b.count} cargos · ${formatMoney(b.total, 2)} en el periodo` : "Cargos del estado de cuenta"}>
      {b.count === 0 ? (
        <EmptyState text="Este estado de cuenta no trae cargos" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Column title="Por categoría" groups={b.byCategory} />
          <Column title="Por comercio o concepto" groups={b.byMerchant} />
        </div>
      )}
    </Panel>
  );
}
