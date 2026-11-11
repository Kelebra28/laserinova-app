import { GLOBAL_COST_DEFAULTS, type GlobalCosts } from "./config";

/**
 * Costo de máquina de UNA pieza de corte o grabado.
 *   costo por minuto = (precio del tubo ÷ horas de vida útil) ÷ 60
 *   costo de máquina = minutos × costo por minuto × factor de miedo × factor de producción
 */
export function machineCostPerPiece(timeMin: number, globals: GlobalCosts): number {
  const tubePrice = globals.precio_tubo || GLOBAL_COST_DEFAULTS.precio_tubo;
  const tubeLifeHours = globals.vida_util_tubo || GLOBAL_COST_DEFAULTS.vida_util_tubo;
  const fearFactor = globals.factor_miedo || GLOBAL_COST_DEFAULTS.factor_miedo;
  const productionFactor = globals.factor_produccion_default || GLOBAL_COST_DEFAULTS.factor_produccion_default;

  const costPerMinute = tubePrice / tubeLifeHours / 60;
  return timeMin * costPerMinute * fearFactor * productionFactor;
}

/** Precio de menudeo: costo real ÷ (1 − margen). El margen se topa en 99% para no dividir entre cero. */
export function priceFromMargin(realCost: number, marginPct: number): number {
  const margin = marginPct >= 100 ? 99 : marginPct;
  return realCost / ((100 - margin) / 100);
}

/** Precio sugerido de menudeo de UNA pieza de corte o grabado, con el margen global. */
export function retailLaserPrice(realCost: number, globals: GlobalCosts): number {
  return priceFromMargin(realCost, globals.margen_default || GLOBAL_COST_DEFAULTS.margen_default);
}

/** Precio sugerido de mayoreo de UNA pieza: material + minutos × costo por minuto de mayoreo. */
export function wholesaleLaserPrice(materialCost: number, timeMin: number, globals: GlobalCosts): number {
  return materialCost + timeMin * (globals.costo_minuto_mayoreo || GLOBAL_COST_DEFAULTS.costo_minuto_mayoreo);
}
