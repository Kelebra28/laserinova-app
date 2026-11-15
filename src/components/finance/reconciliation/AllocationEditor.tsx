"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { RECON_ALLOCATION_TOLERANCE } from "@/constants/reconciliation.constants";
import { formatMoney } from "@/constants/formatters.constants";
import type { OpenQuote } from "@/types/reconciliation";

type Row = { quoteId: string; amount: string };
type Props = {
  total: number;
  quotes: OpenQuote[];
  busy: boolean;
  onConfirm: (allocations: { quoteId: string; amount: number }[]) => void;
  onCancel: () => void;
};

const FIELD = "rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:border-gray-900";

/** Reparto manual: elige la(s) cotización(es) y cuánto del depósito va a cada una. Debe sumar el depósito completo. */
export default function AllocationEditor({ total, quotes, busy, onConfirm, onCancel }: Props) {
  const [rows, setRows] = useState<Row[]>([{ quoteId: "", amount: total.toFixed(2) }]);
  const byId = useMemo(() => new Map(quotes.map((q) => [q.id, q])), [quotes]);

  const parsed = rows.map((r) => ({ quote: byId.get(r.quoteId), amount: parseFloat(r.amount) }));
  const sum = parsed.reduce((s, p) => s + (isNaN(p.amount) ? 0 : p.amount), 0);
  const left = Math.round((total - sum) * 100) / 100;
  const picked = rows.map((r) => r.quoteId).filter(Boolean);
  const problems: string[] = [];
  if (parsed.some((p) => !p.quote)) problems.push("Elige una cotización en cada renglón.");
  if (new Set(picked).size !== picked.length) problems.push("Una cotización no puede repetirse.");
  if (parsed.some((p) => isNaN(p.amount) || p.amount <= 0)) problems.push("Cada monto debe ser mayor a cero.");
  parsed.forEach((p) => p.quote && p.amount > p.quote.owed + 0.05 && problems.push(`${p.quote.folio}: excede su saldo (${formatMoney(p.quote.owed, 2)}).`));
  if (Math.abs(left) > RECON_ALLOCATION_TOLERANCE) problems.push(left > 0 ? `Faltan ${formatMoney(left, 2)} por repartir.` : `Te pasaste por ${formatMoney(-left, 2)}.`);

  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select value={r.quoteId} onChange={(e) => set(i, { quoteId: e.target.value })} className={`${FIELD} flex-1 min-w-[16rem]`}>
            <option value="">Elige la cotización…</option>
            {quotes.map((q) => (
              <option key={q.id} value={q.id} disabled={picked.includes(q.id) && q.id !== r.quoteId}>
                {q.folio} · {q.clientName} · saldo {formatMoney(q.owed, 2)}
              </option>
            ))}
          </select>
          <input value={r.amount} onChange={(e) => set(i, { amount: e.target.value })} inputMode="decimal" aria-label="Monto" className={`${FIELD} w-32 text-right tabular-nums`} />
          {rows.length > 1 && (
            <button onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Quitar" className="text-gray-400 hover:text-gray-900">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <button onClick={() => setRows((rs) => [...rs, { quoteId: "", amount: Math.max(left, 0).toFixed(2) }])} className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 hover:text-gray-900">
        <Plus className="h-3.5 w-3.5" /> Agregar otra cotización
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className={`text-xs ${problems.length ? "text-amber-700" : "text-emerald-700"}`}>{problems.length ? problems[0] : "El reparto suma exactamente el depósito."}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900">
            Cancelar
          </button>
          <button
            disabled={busy || problems.length > 0}
            onClick={() => onConfirm(parsed.map((p) => ({ quoteId: p.quote!.id, amount: Math.round(p.amount * 100) / 100 })))}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-black transition-colors disabled:opacity-50"
          >
            {busy ? "Registrando…" : "Registrar reparto"}
          </button>
        </div>
      </div>
    </div>
  );
}
