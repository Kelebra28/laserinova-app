import { getAnalyticsDataOverviewService } from "@/server/services/analytics.service";
import { AnalyticsContainer } from "@/components/analytics/AnalyticsContainer";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Datos & Analytics | Laser Inova CRM",
  description: "Arquitectura de datos, flujos de procesos y diccionario de schemas para análisis de negocio.",
};

export default async function DataAnalyticsPage() {
  const overviewData = await getAnalyticsDataOverviewService();

  return (
    <div className="py-2">
      <AnalyticsContainer overviewData={overviewData} />
    </div>
  );
}
