"use client";

import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { useDashboardData } from "@/hooks/useDashboardData";
import { exportOverviewCsv } from "@/lib/dashboard-export";
import DashboardHeader from "./organisms/DashboardHeader";
import KpiRow from "./organisms/KpiRow";
import WhatsAppSection from "./sections/WhatsAppSection";
import SalesSection from "./sections/SalesSection";
import OperationsSection from "./sections/OperationsSection";

/**
 * Contenedor del dashboard: aquí vive el estado y la carga de datos; todo lo demás
 * (secciones → organismos → moléculas → átomos) solo recibe props y dibuja.
 */
export default function DashboardClient() {
  const { range, setRange, stats, overview } = useDashboardData();

  if (stats.isLoading) return <DashboardSkeleton />;
  if (stats.error) return <div className="p-8 text-red-500">Error cargando dashboard: {stats.error.message}</div>;
  if (!stats.data) return null;

  const data = overview.data;
  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-500">
      <DashboardHeader
        monthLabel={stats.data.monthLabel}
        range={range}
        onRangeChange={setRange}
        fetching={overview.isFetching}
        onExport={data ? () => exportOverviewCsv(data) : undefined}
      />
      <KpiRow overview={data} receivable={stats.data.kpis} loading={overview.isLoading} failed={overview.isError} />
      {data && <WhatsAppSection whatsapp={data.whatsapp} />}
      {data && <SalesSection overview={data} />}
      <OperationsSection stats={stats.data} />
    </div>
  );
}
