import SectionTitle from "../atoms/SectionTitle";
import SalesFunnelCard from "../organisms/SalesFunnelCard";
import ReceivableAgingCard from "../organisms/ReceivableAgingCard";
import type { DashboardOverview } from "@/types/dashboard";

/** Ventas y cobranza: embudo del chat al cobro y por cobrar por antigüedad. */
export default function SalesSection({ overview }: { overview: DashboardOverview }) {
  return (
    <div className="space-y-6">
      <SectionTitle accent="bg-emerald-600">Ventas y cobranza</SectionTitle>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SalesFunnelCard funnel={overview.funnel} rangeLabel={overview.rangeLabel} />
        <ReceivableAgingCard receivable={overview.receivable} />
      </div>
    </div>
  );
}
