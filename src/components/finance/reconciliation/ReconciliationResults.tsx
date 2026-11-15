"use client";

import { useState } from "react";
import Panel from "@/components/ui/atoms/Panel";
import FilterChip from "@/components/ui/atoms/FilterChip";
import { AllClear } from "@/components/ui/atoms/EmptyState";
import { DEFAULT_RECON_FILTERS, RECON_PAGE_SIZE, RECON_TABS, type ReconFilters, type ReconTabKey } from "@/constants/reconciliation.constants";
import { activeFilterCount, filterLines, filterMatches } from "@/lib/bank-filters";
import { buildReconCsv, downloadTextFile, linesToRows, matchesToRows } from "@/lib/reconciliation-export";
import { formatMoney, formatShortDate } from "@/constants/formatters.constants";
import BankOnlyList from "./BankOnlyList";
import ReconciliationFilters from "./ReconciliationFilters";
import type { BankLine, ReconMatch, ReconResult, SystemMovement } from "@/types/reconciliation";

type Props = {
  result: ReconResult;
  onRegister: (line: BankLine, allocations: { quoteId: string; amount: number }[]) => Promise<{ success: boolean; error?: string }>;
};

const TH = "py-2 pr-4 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500";
const Amount = ({ n }: { n: number }) => <span className={`font-bold tabular-nums ${n >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatMoney(n, 2)}</span>;
const LINK_BUTTON = "text-xs font-bold text-gray-700 hover:text-gray-900 underline-offset-4 hover:underline disabled:opacity-40 disabled:no-underline";

/** Pestañas con el detalle: conciliados, solo banco, solo sistema y efectivo; con búsqueda, filtros y exportación. */
export default function ReconciliationResults({ result, onRegister }: Props) {
  const [filters, setFilters] = useState<ReconFilters>(DEFAULT_RECON_FILTERS);
  const [tab, setTab] = useState<ReconTabKey>(result.bankOnly.length ? "bankOnly" : result.systemOnly.length ? "systemOnly" : "matched");
  const [limit, setLimit] = useState(RECON_PAGE_SIZE);

  // Lo que se muestra en cada pestaña, ya con filtros y orden.
  const view = {
    matched: filterMatches(result.matches, filters),
    bankOnly: filterLines(result.bankOnly, filters),
    systemOnly: filterLines(result.systemOnly, filters),
    cash: filterLines(result.cash, filters),
  };
  const all: Record<ReconTabKey, number> = { matched: result.matches.length, bankOnly: result.bankOnly.length, systemOnly: result.systemOnly.length, cash: result.cash.length };
  const shown: Record<ReconTabKey, number> = { matched: view.matched.length, bankOnly: view.bankOnly.length, systemOnly: view.systemOnly.length, cash: view.cash.length };
  const active = activeFilterCount(filters);
  const meta = RECON_TABS.find((t) => t.key === tab)!;
  const total = shown[tab];

  const change = (patch: Partial<ReconFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setLimit(RECON_PAGE_SIZE);
  };
  const pick = (key: ReconTabKey) => {
    setTab(key);
    setLimit(RECON_PAGE_SIZE);
  };

  const period = `${result.from}_${result.to}`;
  const exportCurrent = () => {
    const rows =
      tab === "matched" ? matchesToRows(view.matched) : tab === "bankOnly" ? linesToRows(view.bankOnly, "Solo en el banco") : tab === "systemOnly" ? linesToRows(view.systemOnly, "Solo en el sistema") : linesToRows(view.cash, "Efectivo");
    downloadTextFile(`conciliacion-${tab}-${period}.csv`, buildReconCsv(rows));
  };
  const exportPending = () => downloadTextFile(`conciliacion-pendientes-${period}.csv`, buildReconCsv([...linesToRows(result.bankOnly, "Solo en el banco"), ...linesToRows(result.systemOnly, "Solo en el sistema")]));

  return (
    <Panel
      title="Detalle"
      subtitle="Empieza por lo que no cuadra"
      action={
        <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
          <button onClick={exportCurrent} disabled={total === 0} className={LINK_BUTTON}>
            Exportar esta lista (CSV)
          </button>
          <button onClick={exportPending} disabled={all.bankOnly + all.systemOnly === 0} className={LINK_BUTTON}>
            Exportar pendientes (CSV)
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-1.5 mb-3">
        {RECON_TABS.map((t) => (
          <FilterChip key={t.key} active={t.key === tab} count={active > 0 ? shown[t.key] : all[t.key]} onClick={() => pick(t.key)}>
            {t.label}
          </FilterChip>
        ))}
      </div>
      <p className="text-xs text-gray-500 mb-3">{meta.hint}</p>

      <ReconciliationFilters filters={filters} onChange={change} onClear={() => change(DEFAULT_RECON_FILTERS)} shown={total} total={all[tab]} active={active} bounds={{ from: result.from, to: result.to }} />

      {tab === "bankOnly" ? (
        <BankOnlyList result={result} filters={filters} onRegister={onRegister} />
      ) : total === 0 ? (
        <AllClear title={all[tab] > 0 ? "Ningún renglón cumple los filtros" : tab === "systemOnly" ? "Nada pendiente aquí" : "Sin renglones"} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {tab === "matched" ? (
                <tr>
                  <th className={TH}>Banco</th>
                  <th className={`${TH} text-right`}>Monto</th>
                  <th className={TH}>Sistema</th>
                  <th className={TH}>Confianza</th>
                </tr>
              ) : (
                <tr>
                  <th className={TH}>Fecha</th>
                  <th className={TH}>Descripción</th>
                  <th className={`${TH} text-right`}>Monto</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-100 align-top">
              {tab === "matched" && view.matched.slice(0, limit).map((m, i) => <MatchRow key={i} match={m} />)}
              {tab === "systemOnly" && view.systemOnly.slice(0, limit).map((s) => <LineRow key={s.id} item={s} />)}
              {tab === "cash" && view.cash.slice(0, limit).map((s) => <LineRow key={s.id} item={s} />)}
            </tbody>
          </table>
          {total > limit && (
            <button onClick={() => setLimit((l) => l + RECON_PAGE_SIZE)} className="mt-3 text-xs font-bold text-gray-900 underline-offset-4 hover:underline">
              Mostrar más ({total - limit} restantes)
            </button>
          )}
        </div>
      )}
    </Panel>
  );
}

function LineRow({ item }: { item: BankLine | SystemMovement }) {
  return (
    <tr>
      <td className="py-2.5 pr-4 tabular-nums text-gray-600 whitespace-nowrap">{formatShortDate(item.date)}</td>
      <td className="py-2.5 pr-4 text-gray-900">{item.description || "—"}</td>
      <td className="py-2.5 text-right whitespace-nowrap">
        <Amount n={item.amount} />
      </td>
    </tr>
  );
}

function MatchRow({ match }: { match: ReconMatch }) {
  const amount = match.bank.reduce((s, b) => s + b.amount, 0);
  return (
    <tr>
      <td className="py-2.5 pr-4">
        {match.bank.map((b) => (
          <div key={b.id} className="text-gray-900">
            <span className="tabular-nums text-gray-500 mr-2">{formatShortDate(b.date)}</span>
            {b.description || "—"}
          </div>
        ))}
      </td>
      <td className="py-2.5 pr-4 text-right whitespace-nowrap">
        <Amount n={amount} />
      </td>
      <td className="py-2.5 pr-4">
        {match.system.map((s) => (
          <div key={s.id} className="text-gray-900">
            <span className="tabular-nums text-gray-500 mr-2">{formatShortDate(s.date)}</span>
            {s.description || "—"}
          </div>
        ))}
      </td>
      <td className="py-2.5 whitespace-nowrap">
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${match.confidence === "high" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {match.previous ? "Conciliado antes" : match.confidence === "high" ? "Alta" : match.bank.length + match.system.length > 2 ? "Varios renglones" : "Media"}
          {match.dayDiff > 0 ? ` · ${match.dayDiff} d` : ""}
        </span>
      </td>
    </tr>
  );
}
