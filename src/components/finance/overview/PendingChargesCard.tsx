"use client";

import { useMemo, useState } from "react";
import Panel from "@/components/ui/atoms/Panel";
import { AllClear } from "@/components/ui/atoms/EmptyState";
import { formatMoney, formatShortDate } from "@/constants/formatters.constants";

export type PendingCharge = { id: string; date: string; label: string; category: string; last4: string; amount: number; description: string };

type Props = {
  charges: PendingCharge[];
  registeredCount: number;
  ignoredCount: number;
  busy: boolean;
  onRegister: (ids: string[]) => void;
  onIgnore: (ids: string[], ignored: boolean) => void;
};

/**
 * Cargos del banco que todavía no son gasto en Finanzas. La persona elige cuáles registrar;
 * lo que no es del negocio se marca para que deje de aparecer. Nada se registra solo.
 */
export default function PendingChargesCard({ charges, registeredCount, ignoredCount, busy, onRegister, onIgnore }: Props) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const ids = useMemo(() => charges.filter((c) => picked.has(c.id)).map((c) => c.id), [charges, picked]);
  const total = useMemo(() => charges.filter((c) => picked.has(c.id)).reduce((s, c) => s + c.amount, 0), [charges, picked]);
  const allPicked = charges.length > 0 && ids.length === charges.length;
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const done = (fn: (ids: string[]) => void) => {
    fn(ids);
    setPicked(new Set());
  };

  return (
    <Panel title="Cargos por registrar como gasto" subtitle={`${charges.length} pendiente${charges.length === 1 ? "" : "s"} · ${registeredCount} ya en Finanzas · ${ignoredCount} marcados como no del negocio`}>
      {charges.length === 0 ? (
        <AllClear title="No hay cargos pendientes" text="Todo lo que salió del banco ya es gasto en Finanzas o está marcado como no del negocio." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-700">
              <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(charges.map((c) => c.id)))} className="h-4 w-4 rounded border-gray-300 accent-black" />
              Todos
            </label>
            <span className="text-xs text-gray-500">{ids.length ? `${ids.length} elegidos · ${formatMoney(total)}` : "Elige cuáles son gastos del taller"}</span>
            <div className="ml-auto flex gap-2">
              <button disabled={!ids.length || busy} onClick={() => done((x) => onIgnore(x, true))} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                No es del negocio
              </button>
              <button disabled={!ids.length || busy} onClick={() => done(onRegister)} className="rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-40">
                {busy ? "Guardando…" : "Registrar como gasto"}
              </button>
            </div>
          </div>
          <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-100">
            {charges.map((c) => (
              <li key={c.id}>
                <label className="flex items-center gap-3 px-3 py-2 text-xs cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} className="h-4 w-4 rounded border-gray-300 accent-black" />
                  <span className="w-16 shrink-0 text-gray-500">{formatShortDate(c.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-gray-900" title={c.description}>
                      {c.label}
                    </span>
                    <span className="text-gray-500">
                      {c.category} · …{c.last4}
                    </span>
                  </span>
                  <span className="font-bold text-gray-900 tabular-nums">{formatMoney(c.amount)}</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
