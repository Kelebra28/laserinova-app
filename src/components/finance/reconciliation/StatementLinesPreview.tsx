import { RECON_PREVIEW_ROWS } from "@/constants/reconciliation.constants";
import { formatMoney, formatShortDate } from "@/constants/formatters.constants";
import type { BankLine } from "@/types/reconciliation";

type Props = { lines: BankLine[]; note?: string };

/** Primeros renglones tal como se leyeron, para confirmar que fechas y signos están bien. */
export default function StatementLinesPreview({ lines, note }: Props) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
            <th className="py-2 pr-4">Fecha</th>
            <th className="py-2 pr-4">Descripción</th>
            <th className="py-2 text-right">Monto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {lines.slice(0, RECON_PREVIEW_ROWS).map((l) => (
            <tr key={l.id}>
              <td className="py-2 pr-4 tabular-nums text-gray-600">{formatShortDate(l.date)}</td>
              <td className="py-2 pr-4 text-gray-900 truncate max-w-[28rem]">{l.description || "—"}</td>
              <td className={`py-2 text-right font-bold tabular-nums ${l.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatMoney(l.amount, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lines.length > RECON_PREVIEW_ROWS && <p className="mt-1 text-[11px] text-gray-400">y {lines.length - RECON_PREVIEW_ROWS} renglones más</p>}
      {note && <p className="mt-2 text-[11px] text-gray-400">{note}</p>}
    </div>
  );
}
