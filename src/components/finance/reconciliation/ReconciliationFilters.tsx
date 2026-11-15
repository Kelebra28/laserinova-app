"use client";

import { Search, X } from "lucide-react";
import SegmentedControl from "@/components/ui/atoms/SegmentedControl";
import { RECON_KIND_OPTIONS, RECON_SORT_OPTIONS, type ReconFilters, type ReconSort } from "@/constants/reconciliation.constants";

type Props = {
  filters: ReconFilters;
  onChange: (patch: Partial<ReconFilters>) => void;
  onClear: () => void;
  /** Cuántos renglones se muestran y cuántos hay en total en la pestaña. */
  shown: number;
  total: number;
  active: number;
  /** Límites de fecha (periodo del estado de cuenta). */
  bounds: { from: string; to: string };
};

const FIELD = "rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-900 focus:outline-none focus:border-gray-900";
const LABEL = "text-[10px] font-bold uppercase tracking-wider text-gray-400";

/** Búsqueda y filtros del detalle: texto, depósitos/cargos, rango de monto, rango de fechas y orden. */
export default function ReconciliationFilters({ filters: f, onChange, onClear, shown, total, active, bounds }: Props) {
  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[14rem]">
          <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={f.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Buscar en la descripción…"
            aria-label="Buscar"
            className={`${FIELD} w-full pl-8`}
          />
        </div>
        <SegmentedControl value={f.kind} onChange={(kind) => onChange({ kind })} options={RECON_KIND_OPTIONS} label="Tipo" />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className={LABEL}>Monto desde</span>
          <input value={f.min} onChange={(e) => onChange({ min: e.target.value })} inputMode="decimal" placeholder="0" aria-label="Monto mínimo" className={`${FIELD} w-28 text-right tabular-nums block`} />
        </label>
        <label className="space-y-1">
          <span className={LABEL}>hasta</span>
          <input value={f.max} onChange={(e) => onChange({ max: e.target.value })} inputMode="decimal" placeholder="sin tope" aria-label="Monto máximo" className={`${FIELD} w-28 text-right tabular-nums block`} />
        </label>
        <label className="space-y-1">
          <span className={LABEL}>Fecha desde</span>
          <input type="date" value={f.from} min={bounds.from} max={bounds.to} onChange={(e) => onChange({ from: e.target.value })} aria-label="Fecha inicial" className={`${FIELD} block`} />
        </label>
        <label className="space-y-1">
          <span className={LABEL}>hasta</span>
          <input type="date" value={f.to} min={bounds.from} max={bounds.to} onChange={(e) => onChange({ to: e.target.value })} aria-label="Fecha final" className={`${FIELD} block`} />
        </label>
        <label className="space-y-1">
          <span className={LABEL}>Ordenar</span>
          <select value={f.sort} onChange={(e) => onChange({ sort: e.target.value as ReconSort })} aria-label="Ordenar" className={`${FIELD} block`}>
            {RECON_SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-3 pb-1.5">
          <span className="text-xs text-gray-500 tabular-nums" aria-live="polite">
            {active > 0 ? <>Mostrando <b className="text-gray-900">{shown}</b> de {total}</> : `${total} renglones`}
          </span>
          {active > 0 && (
            <button onClick={onClear} className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 hover:text-gray-900 underline-offset-4 hover:underline">
              <X className="h-3.5 w-3.5" />
              Limpiar filtros ({active})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
