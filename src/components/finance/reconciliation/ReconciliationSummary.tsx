import { CheckCircle2, FileSpreadsheet, Landmark, Scale } from "lucide-react";
import KpiCard from "@/components/ui/molecules/KpiCard";
import { formatMoney, formatShortDate } from "@/constants/formatters.constants";
import type { ReconResult } from "@/types/reconciliation";

type Props = { result: ReconResult; lineCount: number };

const abs = (xs: { amount: number }[]) => xs.reduce((s, x) => s + Math.abs(x.amount), 0);

/** Los cuatro números que resumen la conciliación. */
export default function ReconciliationSummary({ result: r, lineCount }: Props) {
  const bankNet = r.totals.bankIn - r.totals.bankOut;
  const systemNet = r.totals.systemIn - r.totals.systemOut;
  const diff = bankNet - systemNet;
  const matchedLines = r.matches.reduce((s, m) => s + m.bank.length, 0);
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard label="Conciliado" value={`${matchedLines} de ${lineCount}`} icon={CheckCircle2} tone="text-emerald-500">
        <span className="text-xs text-gray-500">{formatMoney(r.totals.matchedAmount, 2)} coinciden con el sistema</span>
      </KpiCard>
      <KpiCard label="Solo en el banco" value={String(r.bankOnly.length)} icon={Landmark} tone={r.bankOnly.length ? "text-amber-500" : "text-emerald-500"}>
        <span className="text-xs text-gray-500">{formatMoney(abs(r.bankOnly), 2)} sin registrar en el sistema</span>
      </KpiCard>
      <KpiCard label="Solo en el sistema" value={String(r.systemOnly.length)} icon={FileSpreadsheet} tone={r.systemOnly.length ? "text-amber-500" : "text-emerald-500"}>
        <span className="text-xs text-gray-500">{formatMoney(abs(r.systemOnly), 2)} que el banco no muestra</span>
      </KpiCard>
      <KpiCard label="Diferencia neta" value={formatMoney(diff, 2)} icon={Scale} tone={Math.abs(diff) < 0.5 ? "text-emerald-500" : "text-amber-500"}>
        <span className="text-xs text-gray-500">
          Banco {formatMoney(bankNet)} − sistema {formatMoney(systemNet)}
        </span>
        <span className="block text-[11px] text-gray-400 mt-0.5">
          {formatShortDate(r.from)} al {formatShortDate(r.to)} · sin efectivo
        </span>
      </KpiCard>
    </div>
  );
}
