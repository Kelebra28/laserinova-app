import Panel from "../atoms/Panel";
import ProgressBar from "../atoms/ProgressBar";
import { formatMoney, formatPercent } from "@/constants/formatters.constants";
import type { DashboardStats } from "@/types/dashboard";

type Props = { pipeline: DashboardStats["pipeline"]; month: DashboardStats["pipelineMonth"] };

/** Cotizaciones abiertas por etapa. Solo lo aceptado por el cliente suma dinero. */
export default function PipelineCard({ pipeline, month }: Props) {
  const counted = pipeline.filter((p) => p.counted);
  const max = Math.max(...counted.map((p) => p.amount), 1);
  const totalOpen = counted.reduce((s, p) => s + p.amount, 0);
  return (
    <Panel title="Cotizaciones abiertas" subtitle={`${formatMoney(totalOpen)} en proceso`}>
      <div className="space-y-4 flex-1">
        {pipeline.map((p) => (
          <div key={p.key}>
            <div className="flex items-baseline justify-between text-xs mb-1.5">
              <span className="font-semibold text-gray-700">
                {p.label} <span className="text-gray-400 font-medium">· {p.count}</span>
              </span>
              {p.counted ? <span className="font-bold text-gray-900 tabular-nums">{formatMoney(p.amount)}</span> : <span className="text-gray-400 font-medium">sin aceptar · no suma</span>}
            </div>
            <ProgressBar value={p.counted ? (p.amount / max) * 100 : 0} color={p.color} height="h-2" />
          </div>
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="text-gray-500">Creadas este mes</p>
          <p className="text-lg font-black text-gray-900">{month.created}</p>
        </div>
        <div>
          <p className="text-gray-500">Tasa de cierre</p>
          <p className="text-lg font-black text-gray-900">{formatPercent(month.conversionRate)}</p>
        </div>
      </div>
    </Panel>
  );
}
