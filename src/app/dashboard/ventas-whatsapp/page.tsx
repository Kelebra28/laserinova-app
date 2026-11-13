import { getWhatsAppSalesService } from "@/server/services/whatsapp-sales.service";
import { WhatsAppSalesClient } from "@/components/dashboard/WhatsAppSalesClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ventas WhatsApp | Laser Inova CRM",
  description: "Embudo, qué se vende, cuentas por cobrar y tiempos de respuesta desde WhatsApp.",
};

export default async function VentasWhatsAppPage(props: { searchParams: Promise<{ days?: string }> }) {
  const { days } = await props.searchParams;
  const rangeDays = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
  const data = await getWhatsAppSalesService(rangeDays);
  return <WhatsAppSalesClient data={data} />;
}
