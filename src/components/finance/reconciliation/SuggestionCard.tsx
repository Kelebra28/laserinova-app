"use client";

import { useState } from "react";
import AllocationEditor from "./AllocationEditor";
import { formatMoney, formatShortDate } from "@/constants/formatters.constants";
import type { Allocation, BankLine, OpenQuote, Suggestion } from "@/types/reconciliation";

type Props = {
  line: BankLine;
  suggestions: Suggestion[];
  openQuotes: OpenQuote[];
  busy: boolean;
  error: string | null;
  onRegister: (allocations: { quoteId: string; amount: number }[]) => void;
  onDismiss: () => void;
};

const afterText = (a: Allocation) => (a.after === "paid" ? "queda pagada" : `queda con el ${a.percentOfTotal}% cobrado`);

/** Un depósito que no está en el sistema: pregunta a qué cotización pertenece y registra el cobro al confirmar. */
export default function SuggestionCard({ line, suggestions, openQuotes, busy, error, onRegister, onDismiss }: Props) {
  const [manual, setManual] = useState(suggestions.length === 0);
  return (
    <li className="rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-gray-900">
          <span className="tabular-nums text-gray-500 mr-2">{formatShortDate(line.date)}</span>
          {line.description || "Depósito sin descripción"}
        </p>
        <p className="text-base font-black text-emerald-600 tabular-nums">{formatMoney(line.amount, 2)}</p>
      </div>

      {suggestions.length > 0 && !manual && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">¿A qué cotización pertenece?</p>
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-lg bg-gray-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">
                    {s.label}
                    {s.allocations.length === 1 && <span className="font-medium text-gray-600"> · {s.allocations[0].folio}</span>}
                  </p>
                  {s.allocations.map((a) => (
                    <p key={a.quoteId} className="text-xs text-gray-600">
                      <b className="text-gray-900">{a.folio}</b> · {a.project} · {a.clientName}
                      {s.allocations.length > 1 && <span className="tabular-nums"> · {formatMoney(a.amount, 2)}</span>} → {afterText(a)}
                    </p>
                  ))}
                  <p className="mt-1 text-[11px] text-gray-400">{s.reasons.join(" · ")}</p>
                </div>
                <button
                  disabled={busy}
                  onClick={() => onRegister(s.allocations.map((a) => ({ quoteId: a.quoteId, amount: a.amount })))}
                  className="shrink-0 inline-flex items-center gap-2 bg-gray-900 text-white px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-black transition-colors disabled:opacity-50"
                >
                  {busy ? "Registrando…" : s.allocations.length === 1 ? `Sí, registrar ${formatMoney(s.allocations[0].amount, 2)}` : "Sí, registrar los cobros"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {manual && <AllocationEditor total={line.amount} quotes={openQuotes} busy={busy} onConfirm={onRegister} onCancel={() => (suggestions.length ? setManual(false) : onDismiss())} />}

      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        {!manual && (
          <button onClick={() => setManual(true)} className="font-bold text-gray-700 hover:text-gray-900 underline-offset-4 hover:underline">
            {suggestions.length ? "Es de otra cotización o de varias…" : "Asignar a una cotización…"}
          </button>
        )}
        <button onClick={onDismiss} className="font-bold text-gray-400 hover:text-gray-700 underline-offset-4 hover:underline">
          No es de una cotización, saltar
        </button>
      </div>
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
    </li>
  );
}
