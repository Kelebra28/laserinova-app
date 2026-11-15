"use client";

import { useBankOverview } from "@/hooks/useBankOverview";
import { breakdownCharges } from "@/lib/bank-categories";
import { buildOverviewCsv } from "@/lib/overview-export";
import { downloadTextFile } from "@/lib/reconciliation-export";
import OverviewUploader from "./OverviewUploader";
import LoadedStatementsList from "./LoadedStatementsList";
import OverviewControls from "./OverviewControls";
import OverviewKpiRow from "./OverviewKpiRow";
import MonthlyBarsCard from "./MonthlyBarsCard";
import MonthlyTable from "./MonthlyTable";
import InternalTransfersCard from "./InternalTransfersCard";
import OverviewIssues from "./OverviewIssues";
import ChargesBreakdownCard from "../reconciliation/ChargesBreakdownCard";

/** Contenedor: lleva el estado (estados leídos, cuenta, agrupación) y arma las piezas. */
export default function BankOverviewClient() {
  const o = useBankOverview();
  const { overview } = o;
  const loaded = o.statements.length > 0;

  return (
    <div className="space-y-6">
      {!loaded ? (
        <>
          <OverviewUploader onFiles={o.addFiles} progress={o.progress} />
          <OverviewIssues issues={[]} errors={o.errors} />
        </>
      ) : (
        <>
          <LoadedStatementsList statements={o.statements} onRemove={o.removeStatement} onClear={o.clear} />
          <OverviewIssues issues={overview.issues} errors={o.errors} />
          <OverviewControls
            accounts={overview.accounts}
            account={o.account}
            onAccount={o.setAccount}
            mode={o.mode}
            onMode={o.setMode}
            excludeTransfers={o.excludeTransfers}
            onExclude={o.setExcludeTransfers}
            transferCount={overview.transfers.length}
          />
          <OverviewKpiRow totals={overview.totals} excludedCount={overview.excludedCount} />
          <MonthlyBarsCard rows={overview.rows} />
          <MonthlyTable rows={overview.rows} onExport={() => downloadTextFile(`panorama-bancario-${o.mode}.csv`, buildOverviewCsv(overview.rows))} />
          <InternalTransfersCard transfers={overview.transfers} excluded={overview.excludedCount > 0} />
          <ChargesBreakdownCard breakdown={breakdownCharges(overview.lines)} />
          <OverviewUploader onFiles={o.addFiles} progress={o.progress} compact />
        </>
      )}
    </div>
  );
}
