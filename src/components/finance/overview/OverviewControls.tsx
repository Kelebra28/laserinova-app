import SegmentedControl from "@/components/ui/atoms/SegmentedControl";
import { OVERVIEW_ALL_ACCOUNTS, OVERVIEW_MODES, OVERVIEW_TEXTS, type OverviewMode } from "@/constants/bank-overview.constants";
import type { AccountSummary } from "@/types/bank-overview";

type Props = {
  accounts: AccountSummary[];
  account: string;
  onAccount: (id: string) => void;
  mode: OverviewMode;
  onMode: (m: OverviewMode) => void;
  excludeTransfers: boolean;
  onExclude: (v: boolean) => void;
  transferCount: number;
};

const accountLabel = (a: AccountSummary) => `…${a.last4} ${a.product.replace(/BBVA/i, "").trim().split(/\s+/).slice(0, 2).join(" ")}`.trim();

/** Qué cuenta ver, cómo agrupar los meses y si se excluyen las transferencias entre cuentas propias. */
export default function OverviewControls({ accounts, account, onAccount, mode, onMode, excludeTransfers, onExclude, transferCount }: Props) {
  const all = account === OVERVIEW_ALL_ACCOUNTS;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      {accounts.length > 1 && <SegmentedControl size="md" value={account} onChange={onAccount} options={[{ id: OVERVIEW_ALL_ACCOUNTS, label: "Todas" }, ...accounts.map((a) => ({ id: a.id, label: accountLabel(a) }))]} label="Cuenta" />}
      <SegmentedControl size="md" value={mode} onChange={onMode} options={OVERVIEW_MODES} label="Agrupar por" />
      <label className={`inline-flex items-center gap-2 text-sm ${all ? "text-gray-700" : "text-gray-400"}`} title={all ? undefined : OVERVIEW_TEXTS.transfersOnlyAll}>
        <input type="checkbox" checked={all && excludeTransfers} disabled={!all} onChange={(e) => onExclude(e.target.checked)} className="h-4 w-4 accent-gray-900" />
        Excluir transferencias entre mis cuentas
        {transferCount > 0 && <span className="text-xs text-gray-400">({transferCount})</span>}
      </label>
    </div>
  );
}
