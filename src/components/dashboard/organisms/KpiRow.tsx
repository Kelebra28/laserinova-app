import { Hourglass, Inbox, MessageCircle, Timer, TrendingUp, Wallet } from "lucide-react";
import KpiCard, { KpiCardSkeleton } from "../molecules/KpiCard";
import TrendBadge from "../atoms/TrendBadge";
import { CHART_COLORS, COMPARISON_LABEL } from "@/constants/dashboard.constants";
import { formatDuration, formatMoney } from "@/constants/formatters.constants";
import type { DashboardOverview, DashboardStats } from "@/types/dashboard";

type Props = {
  overview: DashboardOverview | undefined;
  receivable: DashboardStats["kpis"];
  loading: boolean;
  failed: boolean;
};

const GRID = "grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4";
const plural = (n: number) => (n === 1 ? "ón" : "ones");

export default function KpiRow({ overview, receivable, loading, failed }: Props) {
  if (loading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 6 }, (_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (failed || !overview) {
    return <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">No se pudieron cargar los indicadores del periodo. Se reintenta solo en un minuto.</div>;
  }
  const { finance: f, whatsapp: wa } = overview;
  const vs = COMPARISON_LABEL[overview.range];
  return (
    <div className={GRID}>
      <KpiCard label="Cobrado" value={formatMoney(f.income.value)} icon={Wallet} tone="text-emerald-500" spark={f.spark.income} sparkColor={CHART_COLORS.income}>
        <TrendBadge value={f.income.change} label={vs} />
      </KpiCard>
      <KpiCard label="Utilidad" value={formatMoney(f.profit.value)} icon={TrendingUp} tone={f.profit.value >= 0 ? "text-emerald-500" : "text-red-500"} spark={f.spark.profit} sparkColor={CHART_COLORS.profitLine}>
        <TrendBadge value={f.profit.change} label={vs} />
      </KpiCard>
      <KpiCard label="Por cobrar" value={formatMoney(receivable.receivable)} icon={Hourglass} tone="text-amber-500">
        <span className="text-xs text-gray-500">
          {receivable.receivableCount} cotizaci{plural(receivable.receivableCount)} con saldo
        </span>
      </KpiCard>
      <KpiCard label="Usuarios que escribieron" value={wa.writers.value.toLocaleString("es-MX")} icon={MessageCircle} tone="text-violet-600" spark={wa.sparkWriters} sparkColor={CHART_COLORS.inbound}>
        <TrendBadge value={wa.writers.change} label={vs} />
        <span className="block text-[11px] text-gray-400 mt-0.5">{wa.inbound.value.toLocaleString("es-MX")} mensajes recibidos</span>
      </KpiCard>
      <KpiCard label="Tiempo de respuesta" value={formatDuration(wa.medianResponseMin)} icon={Timer} tone="text-violet-600">
        <TrendBadge value={wa.responseChange} label={vs} inverse />
      </KpiCard>
      <KpiCard label="Te toca atender" value={String(wa.pending.mine)} icon={Inbox} tone={wa.pending.mine > 0 ? "text-red-500" : "text-emerald-500"} href="/dashboard/chats">
        <span className="text-xs text-gray-500">{wa.pending.mine === 0 ? "Todo al día" : "responder o mandar cotización"}</span>
        <span className="block text-[11px] text-gray-400 mt-0.5">{wa.pending.theirs} esperan al cliente</span>
      </KpiCard>
    </div>
  );
}
