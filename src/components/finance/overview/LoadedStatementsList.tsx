import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import Panel from "@/components/ui/atoms/Panel";
import { formatShortDate } from "@/constants/formatters.constants";
import type { LoadedStatement } from "@/types/bank-overview";

type Props = { statements: LoadedStatement[]; onRemove: (index: number) => void; onClear: () => void };

/** Los estados que ya se leyeron, con su cuenta, periodo y si pasaron los controles del banco. */
export default function LoadedStatementsList({ statements, onRemove, onClear }: Props) {
  return (
    <Panel
      title="Estados cargados"
      subtitle={`${statements.length} estado${statements.length === 1 ? "" : "s"}`}
      action={
        <button onClick={onClear} className="text-xs font-bold text-gray-500 hover:text-gray-900 underline-offset-4 hover:underline">
          Quitar todos
        </button>
      }
    >
      <ul className="flex flex-wrap gap-2">
        {statements.map((s, i) => {
          const ok = s.checks.length > 0 && s.checks.every((c) => c.ok);
          return (
            <li key={`${s.fileName}-${i}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white pl-2.5 pr-1.5 py-1.5 text-xs">
              {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
              <span className="font-bold text-gray-900">…{s.accountLast4}</span>
              <span className="text-gray-500">{s.period ? `${formatShortDate(s.period.from)} al ${formatShortDate(s.period.to)}` : s.fileName}</span>
              <button onClick={() => onRemove(i)} aria-label={`Quitar ${s.fileName}`} className="text-gray-400 hover:text-gray-900">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
