import { prisma } from "@/lib/prisma";

/** Lee de la configuración los costos globales que intervienen en el precio de productos (IVA, escalas, márgenes). */
export async function getProductPricingGlobals(): Promise<Record<string, number>> {
  const rows = await prisma.costConfiguration.findMany({
    where: { active: true },
    select: { key: true, value: true },
  });
  const g: Record<string, number> = {};
  rows.forEach((r) => { g[r.key] = r.value; });
  return g;
}
