"use client";

import { useState } from "react";
import SuggestionCard from "./SuggestionCard";
import { AllClear } from "@/components/ui/atoms/EmptyState";
import { filterLines } from "@/lib/bank-filters";
import { DEFAULT_RECON_FILTERS, type ReconFilters } from "@/constants/reconciliation.constants";
import { formatMoney, formatShortDate } from "@/constants/formatters.constants";
import type { BankLine, ReconResult } from "@/types/reconciliation";

type Props = {
  result: ReconResult;
  filters?: ReconFilters;
  onRegister: (line: BankLine, allocations: { quoteId: string; amount: number }[]) => Promise<{ success: boolean; error?: string }>;
};

/** Lo que está en el banco y no en el sistema: los depósitos preguntan a qué cotización van; los cargos se listan. */
export default function BankOnlyList({ result, filters = DEFAULT_RECON_FILTERS, onRegister }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const visible = filterLines(result.bankOnly, filters);
  const credits = visible.filter((l) => l.amount > 0 && !dismissed.has(l.id));
  const skipped = visible.filter((l) => l.amount > 0 && dismissed.has(l.id));
  const debits = visible.filter((l) => l.amount <= 0);

  const register = async (line: BankLine, allocations: { quoteId: string; amount: number }[]) => {
    setBusyId(line.id);
    setErrors((e) => ({ ...e, [line.id]: "" }));
    const res = await onRegister(line, allocations);
    if (!res.success) setErrors((e) => ({ ...e, [line.id]: res.error ?? "No se pudo registrar el cobro." }));
    setBusyId(null);
  };

  if (credits.length === 0 && debits.length === 0 && skipped.length === 0) return <AllClear title={result.bankOnly.length ? "Ningún renglón cumple los filtros" : "Nada pendiente aquí"} />;

  return (
    <div className="space-y-6">
      {credits.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Depósitos sin registrar ({credits.length})</p>
          <ul className="space-y-3">
            {credits.map((l) => (
              <SuggestionCard
                key={l.id}
                line={l}
                suggestions={result.suggestions[l.id] ?? []}
                openQuotes={result.openQuotes}
                busy={busyId === l.id}
                error={errors[l.id] || null}
                onRegister={(a) => register(l, a)}
                onDismiss={() => setDismissed((d) => new Set(d).add(l.id))}
              />
            ))}
          </ul>
        </div>
      )}

      {skipped.length > 0 && (
        <p className="text-xs text-gray-400">
          {skipped.length} depósito{skipped.length === 1 ? "" : "s"} saltado{skipped.length === 1 ? "" : "s"} (no es de una cotización).{" "}
          <button onClick={() => setDismissed(new Set())} className="font-bold text-gray-600 hover:text-gray-900 underline-offset-4 hover:underline">
            Volver a mostrarlos
          </button>
        </p>
      )}

      {debits.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cargos sin registrar ({debits.length})</p>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {debits.map((l) => (
                <tr key={l.id}>
                  <td className="py-2.5 pr-4 tabular-nums text-gray-600 whitespace-nowrap">{formatShortDate(l.date)}</td>
                  <td className="py-2.5 pr-4 text-gray-900">{l.description || "—"}</td>
                  <td className="py-2.5 text-right font-bold tabular-nums text-red-600 whitespace-nowrap">{formatMoney(l.amount, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-gray-400">Los gastos se capturan desde Finanzas → Registrar movimiento; aquí solo se muestran.</p>
        </div>
      )}
    </div>
  );
}
