import { GLOBAL_COST_DEFAULTS, type GlobalCosts } from "./config";

export interface MaterialData {
  length?: number | null;
  width?: number | null;
  sheetPrice?: number | null;
  guardPercentage?: number | null;
  pricePerCm2?: number | null;
}

/**
 * Precio del material por cm², ya con transporte.
 *   hoja completa:  (precio de la hoja × (1 + transporte)) ÷ (largo × ancho)
 *   material viejo: (precio por cm² ÷ factor de guarda) × (1 + transporte)
 * El precio de la hoja se captura con IVA incluido, por eso aquí no se suma IVA.
 */
export function materialPricePerCm2(material: MaterialData, globals: GlobalCosts): number {
  const transportFactor = 1 + (globals.porcentaje_transporte_material ?? GLOBAL_COST_DEFAULTS.porcentaje_transporte_material) / 100;

  if (material.sheetPrice && material.length && material.width) {
    return (material.sheetPrice * transportFactor) / (material.length * material.width);
  }
  if (material.pricePerCm2) {
    const guardFactor = material.guardPercentage || globals.factor_guarda_default || GLOBAL_COST_DEFAULTS.factor_guarda_default;
    return (material.pricePerCm2 / guardFactor) * transportFactor;
  }
  return 0;
}

export interface MaterialCost {
  base: number;    // área de la pieza × precio por cm²
  wastage: number; // merma de corte sobre el costo base
  total: number;   // base + merma
}

/** Costo de material de UNA pieza: área × precio por cm² + merma de corte. */
export function materialCostPerPiece(
  material: MaterialData,
  partWidth: number,
  partHeight: number,
  globals: GlobalCosts
): MaterialCost {
  const pricePerCm2 = materialPricePerCm2(material, globals);
  if (pricePerCm2 <= 0) return { base: 0, wastage: 0, total: 0 };

  const wastagePct = (globals.porcentaje_merma_corte ?? GLOBAL_COST_DEFAULTS.porcentaje_merma_corte) / 100;
  const base = partWidth * partHeight * pricePerCm2;
  const wastage = base * wastagePct;
  return { base, wastage, total: base + wastage };
}
