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
import PendingChargesCard, { type PendingCharge } from "./PendingChargesCard";
import ChargesBreakdownCard from "../reconciliation/ChargesBreakdownCard";
import { categorizeCharge, merchantOf } from "@/lib/bank-categories";
import { OVERVIEW_ALL_ACCOUNTS } from "@/constants/bank-overview.constants";
import type { LoadedStatement } from "@/types/bank-overview";

/** Contenedor: lleva el estado (estados leídos, cuenta, agrupación) y arma las piezas. */
export default function BankOverviewClient({ initial }: { initial: LoadedStatement[] }) {
  const o = useBankOverview(initial);
  const { overview } = o;
  const loaded = o.statements.length > 0;

  // Cargos pendientes de la cuenta elegida, sin las transferencias entre cuentas propias (no son gasto).
  const transferIds = new Set(overview.transfers.map((t) => t.id.slice(t.id.indexOf(":") + 1)));
  const scoped = o.statements.filter((s) => o.account === OVERVIEW_ALL_ACCOUNTS || s.accountId === o.account);
  const lines = scoped.flatMap((s) => s.lines.map((l) => ({ l, last4: s.accountLast4 ?? "????" })));
  const pending: PendingCharge[] = lines
    .filter(({ l }) => l.amount < 0 && l.state === "PENDIENTE" && !transferIds.has(l.id))
    .map(({ l, last4 }) => ({ id: l.id, date: l.date, label: merchantOf(l.description), category: categorizeCharge(l.description).label, last4, amount: Math.abs(l.amount), description: l.description }));
  const countState = (st: string) => lines.filter(({ l }) => l.amount < 0 && l.state === st).length;

  return (
    <div className="space-y-6">
      {!loaded ? (
        <>
          <OverviewUploader onFiles={o.addFiles} progress={o.progress} />
          <OverviewIssues issues={[]} errors={o.errors} />
        </>
      ) : (
        <>
          <LoadedStatementsList statements={o.statements} onRemove={o.removeStatement} />
          {o.notices.map((n) => (
            <p key={n} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800">
              {n}
            </p>
          ))}
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
          <PendingChargesCard charges={pending} registeredCount={countState("GASTO")} ignoredCount={countState("IGNORADO")} busy={o.busy} onRegister={o.registerExpenses} onIgnore={o.ignoreCharges} />
          <ChargesBreakdownCard breakdown={breakdownCharges(overview.lines)} />
          <OverviewUploader onFiles={o.addFiles} progress={o.progress} compact />
        </>
      )}
    </div>
  );
}
