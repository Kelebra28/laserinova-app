import { Bot, Clock, MessageCircle, UserCheck, UserPlus } from "lucide-react";
import Panel from "../atoms/Panel";
import StatBlock from "../molecules/StatBlock";
import { formatDuration } from "@/constants/formatters.constants";
import type { DashboardOverview } from "@/types/dashboard";

type Props = { whatsapp: DashboardOverview["whatsapp"] };

/** Cómo se responde: tiempos, contactos nuevos y reparto bot vs equipo. */
export default function ResponseCard({ whatsapp: wa }: Props) {
  const share = wa.botShare;
  return (
    <Panel title="Cómo se responde" subtitle="Bot contra equipo en el periodo" className="h-full">
      <div className="grid grid-cols-2 gap-4">
        <StatBlock icon={Clock} label="Mediana" value={formatDuration(wa.medianResponseMin)} />
        <StatBlock icon={Clock} label="El 90% en menos de" value={formatDuration(wa.p90ResponseMin)} />
        <StatBlock icon={UserPlus} label="Contactos nuevos" value={wa.newContacts.value.toLocaleString("es-MX")} />
        <StatBlock icon={MessageCircle} label="Respuestas enviadas" value={wa.outbound.value.toLocaleString("es-MX")} />
      </div>
      <div className="mt-5 pt-4 border-t border-gray-100">
        {share === null ? (
          <p className="text-xs text-gray-400">Sin respuestas enviadas en este periodo</p>
        ) : (
          <>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
              <div className="bg-violet-600" style={{ width: `${share}%` }} />
              <div className="bg-gray-800" style={{ width: `${100 - share}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-gray-600">
                <Bot className="h-3.5 w-3.5 text-violet-600" />
                Bot <b className="text-gray-900 tabular-nums">{wa.botReplies}</b> · {share.toFixed(0)}%
              </span>
              <span className="inline-flex items-center gap-1.5 text-gray-600">
                <UserCheck className="h-3.5 w-3.5 text-gray-800" />
                Equipo <b className="text-gray-900 tabular-nums">{wa.humanReplies}</b> · {(100 - share).toFixed(0)}%
              </span>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}
