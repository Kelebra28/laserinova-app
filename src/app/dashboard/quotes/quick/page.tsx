import { prisma } from "@/lib/prisma";
import QuickQuoteForm from "@/components/quotes/QuickQuoteForm";

export const dynamic = "force-dynamic";

export default async function QuickQuotePage() {
  // Buscar el margen por defecto en la configuración
  const config = await prisma.costConfiguration.findUnique({
    where: { key: "margen_default" }
  });

  // Si no existe, usamos 50 como respaldo
  const defaultMargin = config ? config.value : 50;

  const clients = await prisma.client.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });

  return <QuickQuoteForm defaultMargin={defaultMargin} clients={clients} />;
}
