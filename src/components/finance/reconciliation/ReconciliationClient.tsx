"use client";

import { useReconciliation } from "@/hooks/useReconciliation";
import StatementUploader from "./StatementUploader";
import ColumnMapper from "./ColumnMapper";
import PdfSummary from "./PdfSummary";
import ReconciliationSummary from "./ReconciliationSummary";
import ReconciliationResults from "./ReconciliationResults";
import ReconciliationCharts from "./ReconciliationCharts";
import type { LoadedStatement } from "@/types/bank-overview";

/** Contenedor: lleva el estado (archivo, columnas, resultado) y arma las piezas. */
export default function ReconciliationClient({ stored = [] }: { stored?: LoadedStatement[] }) {
  const r = useReconciliation();
  return (
    <div className="space-y-6">
      {r.error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{r.error}</div>}

      {r.pdf && r.report ? (
        <PdfSummary fileName={r.fileName ?? "estado de cuenta"} statement={r.pdf} running={r.running} onRun={r.run} onReset={() => r.reset()} />
      ) : !r.parsed || !r.report ? (
        <StatementUploader onFile={r.loadFile} reading={r.reading} stored={stored} onStored={r.useStored} />
      ) : (
        <ColumnMapper
          fileName={r.fileName ?? "estado de cuenta"}
          headers={r.headers}
          headerRow={r.headerRow}
          rowCount={r.parsed.rows.length}
          mapping={r.mapping}
          report={r.report}
          running={r.running}
          onHeaderRow={r.setHeaderRow}
          onField={r.setField}
          onRun={r.run}
          onReset={() => r.reset()}
        />
      )}

      {r.result && r.report && (
        <>
          <ReconciliationSummary result={r.result} lineCount={r.report.lines.length} />
          <ReconciliationCharts result={r.result} lineCount={r.report.lines.length} lines={r.report.lines} />
          <ReconciliationResults result={r.result} onRegister={r.register} />
        </>
      )}
    </div>
  );
}
