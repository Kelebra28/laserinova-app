import { AlertTriangle, CheckCircle2, Sigma } from "lucide-react";
import Panel from "@/components/ui/atoms/Panel";
import { EmptyState } from "@/components/ui/atoms/EmptyState";
import { formatMoney } from "@/constants/formatters.constants";
import type { OverviewRow, VerificationStatus } from "@/types/bank-overview";

type Props = { rows: OverviewRow[]; onExport: () => void };

const TH = "py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-500";

function Verification({ status, notes }: { status: VerificationStatus; notes: string[] }) {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
        <CheckCircle2 className="h-4 w-4" /> cuadra
      </span>
    );
  }
  const Icon = status === "warn" ? AlertTriangle : Sigma;
  const tone = status === "warn" ? "text-amber-700" : "text-gray-500";
  return (
    <span className={`inline-flex items-start gap-1.5 ${tone}`} title={notes.join("\n")}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <span className="text-xs">{status === "warn" ? notes[0] : "calculado"}</span>
    </span>
  );
}

/** Tabla "Por mes": ingresos, egresos, neto, saldo final y si el periodo cuadra con el estado de cuenta. */
export default function MonthlyTable({ rows, onExport }: Props) {
  return (
    <Panel
      title="Por periodo"
      action={
        <button onClick={onExport} disabled={rows.length === 0} className="text-xs font-bold text-gray-700 hover:text-gray-900 underline-offset-4 hover:underline disabled:opacity-40">
          Exportar tabla (CSV)
        </button>
      }
    >
      {rows.length === 0 ? (
        <EmptyState text="Sin periodos para mostrar" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className={TH}>Periodo</th>
                <th className={`${TH} text-right`}>Ingresos</th>
                <th className={`${TH} text-right`}>Egresos</th>
                <th className={`${TH} text-right`}>Neto</th>
                <th className={`${TH} text-right`}>Saldo final</th>
                <th className={TH}>Verificación contra el estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="py-2.5 px-3 font-semibold text-gray-900">{r.label}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700">{formatMoney(r.income, 2)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-red-600">{formatMoney(r.expense, 2)}</td>
                  <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${r.net >= 0 ? "text-gray-900" : "text-red-600"}`}>{formatMoney(r.net, 2)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{r.closingBalance === null ? "—" : formatMoney(r.closingBalance, 2)}</td>
                  <td className="py-2.5 px-3">
                    <Verification status={r.status} notes={r.notes} />
                    {r.status === "warn" && r.notes.length > 1 && <span className="ml-5 text-[11px] text-gray-400">+{r.notes.length - 1} más</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
