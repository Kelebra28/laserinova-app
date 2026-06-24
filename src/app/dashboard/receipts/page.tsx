import ReceiptsDashboard from "./ReceiptsDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recibos y Notas de Pedido - Laser Inova",
  description: "Módulo de Recibos y Notas de Pedido de Laser Inova CRM",
};

export default function ReceiptsPage() {
  return <ReceiptsDashboard />;
}
