import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Panel from "@/components/ui/atoms/Panel";
import StatementLinesPreview from "./StatementLinesPreview";
import { formatShortDate } from "@/constants/formatters.constants";
import type { ParsedStatement } from "@/types/bank-statement";

type Props = { fileName: string; statement: ParsedStatement; running: boolean; onRun: () => void; onReset: () => void };

/** Resultado de leer el PDF: qué banco es, el periodo y si la lectura coincide con los totales que imprime el banco. */
export default function PdfSummary({ fileName, statement: s, running, onRun, onReset }: Props) {
  const allOk = s.checks.length > 0 && s.checks.every((c) => c.ok);
  const subtitle = [s.bank, s.accountLast4 ? `cuenta …${s.accountLast4}` : null, s.period ? `${formatShortDate(s.period.from)} al ${formatShortDate(s.period.to)}` : null, `${s.lines.length} movimientos`].filter(Boolean).join(" · ");
  return (
    <Panel
      title="Se leyó tu estado de cuenta"
      subtitle={`${fileName} · ${subtitle}`}
      action={
        <button onClick={onReset} className="text-xs font-bold text-gray-500 hover:text-gray-900 underline-offset-4 hover:underline">
          Cambiar archivo
        </button>
      }
    >
      <ul className="space-y-1.5">
        {s.checks.map((c) => (
          <li key={c.label} className="flex items-start gap-2 text-sm">
            {c.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />}
            <span className="text-gray-900">
              <b>{c.label}:</b> <span className={c.ok ? "text-gray-600" : "text-amber-700"}>{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      {!allOk && (
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          {s.checks.length === 0 ? "No se pudo comprobar la lectura contra los totales del banco." : "La lectura no coincide con los totales que imprime el banco: puede faltar o sobrar algún movimiento."} Revisa los renglones antes de conciliar.
        </p>
      )}
      {s.warnings.map((w) => (
        <p key={w} className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          {w}
        </p>
      ))}

      <StatementLinesPreview lines={s.lines} note="Verde = entra al banco (abono) · rojo = sale (cargo). El texto incluye el concepto que escribió quien pagó." />

      <div className="mt-5 flex justify-end">
        <button
          onClick={onRun}
          disabled={running || s.lines.length === 0}
          className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-colors active:scale-95 disabled:opacity-50"
        >
          {running ? "Conciliando…" : allOk ? "Conciliar" : "Conciliar de todos modos"}
        </button>
      </div>
    </Panel>
  );
}
