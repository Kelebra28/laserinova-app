import Panel from "@/components/ui/atoms/Panel";
import StatementLinesPreview from "./StatementLinesPreview";
import { BANK_FIELD_LABELS, type BankField } from "@/constants/reconciliation.constants";
import type { ColumnMapping, NormalizeReport } from "@/types/reconciliation";

type Props = {
  fileName: string;
  headers: string[];
  headerRow: number;
  rowCount: number;
  mapping: ColumnMapping;
  report: NormalizeReport;
  running: boolean;
  onHeaderRow: (row: number) => void;
  onField: (field: BankField, index: number | undefined) => void;
  onRun: () => void;
  onReset: () => void;
};

const FIELDS = Object.keys(BANK_FIELD_LABELS) as BankField[];
const SELECT = "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:border-gray-900";

/** Confirma qué columna del CSV es cada dato y muestra cómo se leyeron los primeros renglones. */
export default function ColumnMapper({ fileName, headers, headerRow, rowCount, mapping, report, running, onHeaderRow, onField, onRun, onReset }: Props) {
  return (
    <Panel
      title="Revisa cómo se leyó el archivo"
      subtitle={`${fileName} · ${report.lines.length} movimientos leídos${report.skipped ? ` · ${report.skipped} renglones ignorados` : ""}`}
      action={
        <button onClick={onReset} className="text-xs font-bold text-gray-500 hover:text-gray-900 underline-offset-4 hover:underline">
          Cambiar archivo
        </button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 space-y-1">
          Fila de títulos
          <input type="number" min={1} max={Math.max(rowCount, 1)} value={headerRow + 1} onChange={(e) => onHeaderRow(Math.max(0, Math.min(rowCount - 1, (parseInt(e.target.value, 10) || 1) - 1)))} className={SELECT} />
        </label>
        {FIELDS.map((f) => (
          <label key={f} className="text-[11px] font-bold uppercase tracking-wider text-gray-500 space-y-1">
            {BANK_FIELD_LABELS[f]}
            <select value={mapping[f] ?? ""} onChange={(e) => onField(f, e.target.value === "" ? undefined : Number(e.target.value))} className={SELECT}>
              <option value="">— ninguna —</option>
              {headers.map((h, i) => (
                <option key={i} value={i}>
                  {h || `Columna ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {report.warnings.map((w) => (
        <p key={w} className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          {w}
        </p>
      ))}

      <StatementLinesPreview lines={report.lines} note="Verde = entra al banco (abono) · rojo = sale (cargo). Si los signos salen al revés, elige las columnas de cargos y abonos." />

      <div className="mt-5 flex justify-end">
        <button
          onClick={onRun}
          disabled={running || report.lines.length === 0}
          className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-colors active:scale-95 disabled:opacity-50"
        >
          {running ? "Conciliando…" : "Conciliar"}
        </button>
      </div>
    </Panel>
  );
}
