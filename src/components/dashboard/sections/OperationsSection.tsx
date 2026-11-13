import SectionTitle from "../atoms/SectionTitle";
import CashflowCard from "../organisms/CashflowCard";
import PipelineCard from "../organisms/PipelineCard";
import AttentionCard from "../organisms/AttentionCard";
import TasksCard from "../organisms/TasksCard";
import RankingCard from "../organisms/RankingCard";
import type { DashboardStats } from "@/types/dashboard";

/** Operación y finanzas del mes: flujo, cotizaciones abiertas, atención, tareas y rankings. */
export default function OperationsSection({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      <SectionTitle accent="bg-gray-900">Operación y finanzas</SectionTitle>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <CashflowCard chart={stats.chart} totals={stats.chartTotals} />
        </div>
        <PipelineCard pipeline={stats.pipeline} month={stats.pipelineMonth} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <AttentionCard groups={stats.attention} dormant={stats.dormantQuotes} />
        </div>
        <TasksCard tasks={stats.activeTasks} open={stats.tasksOpen} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RankingCard
          title="Mejores clientes"
          subtitle="Cotizado este mes"
          empty="Aún no hay cotizaciones este mes"
          rows={stats.topClients.map((c) => ({ label: c.name, sub: `${c.count} cotizaci${c.count === 1 ? "ón" : "ones"}`, value: c.total }))}
        />
        <RankingCard
          title="Materiales con más venta"
          subtitle="Importe vendido este mes"
          empty="Sin materiales vendidos este mes"
          rows={stats.topMaterials.map((m) => ({ label: m.name, sub: `${m.quantity.toLocaleString("es-MX")} pzas`, value: m.amount }))}
        />
      </div>
    </div>
  );
}
