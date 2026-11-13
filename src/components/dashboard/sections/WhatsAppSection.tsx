import SectionTitle from "../atoms/SectionTitle";
import ActionLink from "../atoms/ActionLink";
import MessageVolumeCard from "../organisms/MessageVolumeCard";
import PendingCard from "../organisms/PendingCard";
import ActivityHeatmapCard from "../organisms/ActivityHeatmapCard";
import ResponseCard from "../organisms/ResponseCard";
import type { DashboardOverview } from "@/types/dashboard";

/** Actividad de WhatsApp: usuarios, pendientes, horarios y respuesta. */
export default function WhatsAppSection({ whatsapp }: { whatsapp: DashboardOverview["whatsapp"] }) {
  return (
    <div className="space-y-6">
      <SectionTitle
        accent="bg-violet-600"
        action={
          <ActionLink href="/dashboard/ventas-whatsapp" tone="whatsapp">
            Ventas WhatsApp →
          </ActionLink>
        }
      >
        WhatsApp
      </SectionTitle>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <MessageVolumeCard whatsapp={whatsapp} />
        </div>
        <PendingCard pending={whatsapp.pending} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ActivityHeatmapCard heatmap={whatsapp.heatmap} />
        </div>
        <ResponseCard whatsapp={whatsapp} />
      </div>
    </div>
  );
}
