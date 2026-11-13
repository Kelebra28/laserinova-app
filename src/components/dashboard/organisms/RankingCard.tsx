import Panel from "../atoms/Panel";
import RankedRow from "../molecules/RankedRow";
import { EmptyState } from "../atoms/EmptyState";
import { formatMoney } from "@/constants/formatters.constants";

type Row = { label: string; sub: string; value: number };
type Props = { title: string; subtitle: string; empty: string; rows: Row[] };

/** Ranking con barras proporcionales al importe más alto. */
export default function RankingCard({ title, subtitle, empty, rows }: Props) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <Panel title={title} subtitle={subtitle} className="h-full">
      {rows.length === 0 ? (
        <EmptyState text={empty} />
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <RankedRow key={`${r.label}-${i}`} label={r.label} sub={r.sub} valueLabel={formatMoney(r.value)} percent={(r.value / max) * 100} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
