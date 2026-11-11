import type { GlobalCosts } from "./config";
import { materialCostPerPiece, type MaterialData } from "./material";
import { machineCostPerPiece, retailLaserPrice, wholesaleLaserPrice } from "./laser";
import { serviceSiteCost, serviceSitePrice } from "./service-site";

/**
 * Cálculo de un concepto de cotización. Cada tipo tiene su fórmula:
 *   CORTE, GRABADO      material + máquina (laser.ts, material.ts)
 *   SERVICIO_SITIO      costos por día + ganancia (service-site.ts)
 *   IMPRESION, PRODUCTO, RESALE, OTRO   precio y costo capturados a mano
 * El precio de productos de catálogo por escala se resuelve aparte (product.ts) y entra aquí
 * como precio manual.
 */

export type CalculationType = "CORTE" | "GRABADO" | "IMPRESION" | "PRODUCTO" | "OTRO" | "RESALE" | "SERVICIO_SITIO";

/** Tipos cuyo precio sale de una fórmula (los demás se capturan a mano). */
export const FORMULA_CONCEPT_TYPES: CalculationType[] = ["CORTE", "GRABADO", "SERVICIO_SITIO"];

export interface CalculationInput {
  type: CalculationType;
  quantity: number;

  // CORTE, GRABADO
  material?: MaterialData;
  clientProvidesMaterial?: boolean;
  partWidth?: number;
  partHeight?: number;
  timeMin?: number;
  isWholesale?: boolean; // mayoreo o menudeo

  // Precio y costo unitarios capturados a mano. En los tipos con fórmula sustituyen al calculado.
  manualUnitPrice?: number;
  manualCost?: number;

  // SERVICIO_SITIO
  serviceDays?: number;
  serviceHours?: number;
  operatorCost?: number;
  transportCost?: number;
  installCost?: number;
  laserUseCost?: number;
  consumablesCost?: number;
  viaticsCost?: number;
  margin?: number;
}

/** Importes del concepto completo (ya multiplicados por la cantidad). */
export interface CalculationResult {
  materialBaseCost: number;    // material sin merma
  materialWastageCost: number; // merma de corte
  materialCost: number;        // material + merma
  productionCost: number;      // máquina
  realCost: number;            // material + máquina (o el costo manual)
  suggestedPrice: number;      // precio de venta sugerido, sin IVA
}

const round2 = (n: number) => Number(n.toFixed(2));

export function calculateConcept(input: CalculationInput, globals: GlobalCosts): CalculationResult {
  // Importes por pieza
  let materialBaseCost = 0;
  let materialWastageCost = 0;
  let materialCost = 0;
  let productionCost = 0;
  let realCost = 0;
  let suggestedPrice = 0;

  switch (input.type) {
    case "CORTE":
    case "GRABADO": {
      if (input.material && input.partWidth && input.partHeight && !input.clientProvidesMaterial) {
        const m = materialCostPerPiece(input.material, input.partWidth, input.partHeight, globals);
        materialBaseCost = m.base;
        materialWastageCost = m.wastage;
        materialCost = m.total;
      }
      const timeMin = input.timeMin || 0;
      productionCost = machineCostPerPiece(timeMin, globals);
      realCost = input.manualCost || (materialCost + productionCost);
      suggestedPrice = input.manualUnitPrice
        || (input.isWholesale ? wholesaleLaserPrice(materialCost, timeMin, globals) : retailLaserPrice(realCost, globals));
      break;
    }

    case "RESALE":
    case "IMPRESION":
    case "PRODUCTO":
    case "OTRO":
      realCost = input.manualCost || 0;
      materialBaseCost = realCost;
      suggestedPrice = input.manualUnitPrice || 0;
      break;

    case "SERVICIO_SITIO":
      realCost = input.manualCost || serviceSiteCost(input, globals);
      suggestedPrice = input.manualUnitPrice || serviceSitePrice(realCost, input.margin);
      break;
  }

  return {
    materialBaseCost: round2(materialBaseCost * input.quantity),
    materialWastageCost: round2(materialWastageCost * input.quantity),
    materialCost: round2(materialCost * input.quantity),
    productionCost: round2(productionCost * input.quantity),
    realCost: round2(realCost * input.quantity),
    suggestedPrice: round2(suggestedPrice * input.quantity),
  };
}
