import { prisma } from "@/lib/prisma";
import { modelCostKey } from "@/lib/calculations";

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

/** Costo más alto por proveedor+modelo (clave de modelCostKey): todos los colores se cotizan con el más caro. */
export async function getModelMaxCostMap(): Promise<Record<string, number>> {
  const rows = await prisma.product.groupBy({
    by: ["provider", "model"],
    where: { active: true, model: { not: null } },
    _max: { unitCost: true },
  });
  const map: Record<string, number> = {};
  rows.forEach((r) => { map[modelCostKey(r)] = r._max.unitCost ?? 0; });
  return map;
}
