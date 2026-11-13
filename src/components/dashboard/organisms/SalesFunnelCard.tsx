import { ArrowDown } from "lucide-react";
import Panel from "../atoms/Panel";
import ProgressBar from "../atoms/ProgressBar";
import { formatMoney, formatPercent } from "@/constants/formatters.constants";
import type { DashboardOverview } from "@/types/dashboard";

type Props = { funnel: DashboardOverview["funnel"]; rangeLabel: string };

/** Del chat al cobro: cuántos avanzan en cada paso y qué porcentaje se queda en el camino. */
export default function SalesFunnelCard({ funnel, rangeLabel }: Props) {
  const max = Math.max(...funnel.steps.map((s) => s.count), 1);
  return (
    <Panel title="Del chat al cobro" subtitle={`Cotizaciones nacidas en WhatsApp · ${rangeLabel.toLowerCase()}`} className="h-full">
      <div className="space-y-1">
        {funnel.steps.map((s) => (
          <div key={s.key}>
            {s.conversion !== null && (
              <div className="flex items-center gap-1.5 pl-1 py-0.5 text-[11px] font-bold text-gray-400">
                <ArrowDown className="h-3 w-3" />
                {formatPercent(s.conversion)}
              </div>
            )}
            <div className="flex items-baseline justify-between text-xs mb-1">
              <span className="font-semibold text-gray-700">{s.label}</span>
              <span className="tabular-nums">
                <b className="text-gray-900 text-sm">{s.count}</b>
                {s.amount !== null && <span className="text-gray-400 ml-2">{formatMoney(s.amount)}</span>}
              </span>
            </div>
            <ProgressBar value={Math.max((s.count / max) * 100, s.count > 0 ? 3 : 0)} color={s.color} height="h-6" className="bg-gray-50 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-xs">
        <Figure label="Tasa de cierre" value={formatPercent(funnel.closeRate)} />
        <Figure label="Ticket promedio" value={funnel.avgTicket === null ? "—" : formatMoney(funnel.avgTicket)} />
        <Figure label="Perdidas" value={String(funnel.lostCount)} />
      </div>
    </Panel>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className="text-lg font-black text-gray-900">{value}</p>
    </div>
  );
}
