import Panel from "../atoms/Panel";
import { AllClear } from "../atoms/EmptyState";
import { formatMoney } from "@/constants/formatters.constants";
import type { DashboardOverview } from "@/types/dashboard";

type Props = { receivable: DashboardOverview["receivable"] };

const OLD_DEBT_DAYS = 60;

/** Por cobrar separado por antigüedad y quién más debe. */
export default function ReceivableAgingCard({ receivable: r }: Props) {
  return (
    <Panel title="Por cobrar por antigüedad" subtitle={`${formatMoney(r.total)} pendientes · antigüedad desde el cierre o envío`} className="h-full">
      {r.total <= 0 ? (
        <AllClear title="Nada por cobrar" />
      ) : (
        <>
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
            {r.aging.map((b) => (
              <div key={b.label} title={`${b.label}: ${formatMoney(b.amount)}`} style={{ width: `${(b.amount / r.total) * 100}%`, backgroundColor: b.color }} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {r.aging.map((b) => (
              <div key={b.label}>
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                  {b.label}
                </p>
                <p className="text-base font-black text-gray-900 tabular-nums mt-0.5">{formatMoney(b.amount)}</p>
                <p className="text-[11px] text-gray-400">
                  {b.count} cotizaci{b.count === 1 ? "ón" : "ones"}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Quién más debe</p>
            <ul className="space-y-2">
              {r.topDebtors.map((d) => (
                <li key={d.client} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold text-gray-900 truncate block">{d.client}</span>
                    <span className={`text-[11px] ${d.oldestDays > OLD_DEBT_DAYS ? "text-red-600 font-bold" : "text-gray-500"}`}>
                      {d.count} cotizaci{d.count === 1 ? "ón" : "ones"} · la más vieja hace {d.oldestDays} d
                    </span>
                  </span>
                  <span className="font-bold text-gray-900 tabular-nums shrink-0">{formatMoney(d.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </Panel>
  );
}
