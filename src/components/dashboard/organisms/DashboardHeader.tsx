import Link from "next/link";
import { Download, Plus } from "lucide-react";
import SegmentedControl from "../atoms/SegmentedControl";
import { DASHBOARD_RANGES } from "@/constants/dashboard.constants";
import type { DashboardRange } from "@/types/dashboard";

type Props = {
  monthLabel: string;
  range: DashboardRange;
  onRangeChange: (r: DashboardRange) => void;
  fetching: boolean;
  onExport?: () => void;
};

export default function DashboardHeader({ monthLabel, range, onRangeChange, fetching, onExport }: Props) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Panel de <span className="text-red-600">Control</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1 capitalize flex items-center gap-2">
          {monthLabel}
          <span className="inline-flex items-center gap-1.5 normal-case text-xs text-gray-400">
            <span className={`h-1.5 w-1.5 rounded-full ${fetching ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`} />
            {fetching ? "Actualizando…" : "En vivo"}
          </span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl size="md" value={range} onChange={onRangeChange} options={DASHBOARD_RANGES} label="Periodo" />
        <button
          onClick={onExport}
          disabled={!onExport}
          title="Descargar el resumen del periodo en CSV"
          className="inline-flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Exportar
        </button>
        <Link
          href="/dashboard/quotes/new"
          prefetch={false}
          className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-colors active:scale-95"
        >
          <Plus className="h-4 w-4 text-red-500" />
          Nueva cotización
        </Link>
      </div>
    </div>
  );
}
