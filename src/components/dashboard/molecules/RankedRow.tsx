import ProgressBar from "../atoms/ProgressBar";

type Props = { label: string; sub: string; valueLabel: string; percent: number };

/** Renglón de ranking: nombre, importe y barra proporcional. */
export default function RankedRow({ label, sub, valueLabel, percent }: Props) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold text-gray-900 truncate">{label}</span>
        <span className="font-bold text-gray-900 tabular-nums shrink-0">{valueLabel}</span>
      </div>
      <div className="flex items-center gap-3 mt-1">
        <ProgressBar value={percent} className="flex-1" />
        <span className="text-[11px] text-gray-500 shrink-0">{sub}</span>
      </div>
    </li>
  );
}
