import { prisma } from "@/lib/prisma";
import { buildGlobalCosts, toConfigMap, type GlobalCosts } from "./config";
import { modelCostKey } from "./product";

/** Mapa key→valor de la configuración de costos activa, tal como está en la base (sin valores por defecto). */
export async function getCostConfigMap(): Promise<Record<string, number>> {
  const rows = await prisma.costConfiguration.findMany({
    where: { active: true },
    select: { key: true, value: true },
  });
  return toConfigMap(rows);
}

/** Costos globales listos para las fórmulas: configuración activa + valores por defecto. */
export async function getGlobalCosts(): Promise<GlobalCosts> {
  return buildGlobalCosts(await getCostConfigMap());
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
