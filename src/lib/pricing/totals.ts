import { GLOBAL_COST_DEFAULTS } from "./config";

export interface QuoteTotals {
  subtotal: number; // suma de los conceptos, sin IVA
  iva: number;
  total: number;
  costoReal: number;
  utilidad: number; // subtotal − costo real (el IVA no es utilidad)
}

/** % de IVA configurado, o el de defecto si no hay o está en 0. */
export function ivaPct(globals?: Record<string, number | undefined> | null): number {
  return Number(globals?.porcentaje_iva) || GLOBAL_COST_DEFAULTS.porcentaje_iva;
}

/** IVA de un importe con el porcentaje dado (por defecto, el de la configuración base). */
export function ivaOf(amount: number, pct: number = GLOBAL_COST_DEFAULTS.porcentaje_iva): number {
  return amount * (pct / 100);
}

/**
 * Totales de una cotización. Si no es facturable (taxable = false) no lleva IVA.
 * conceptsTotal: suma de los importes de los conceptos; realCost: suma de sus costos reales.
 */
export function calculateQuoteTotals(
  conceptsTotal: number,
  realCost: number,
  opts: { taxable: boolean; ivaPct: number }
): QuoteTotals {
  const iva = opts.taxable ? ivaOf(conceptsTotal, opts.ivaPct) : 0;
  return {
    subtotal: conceptsTotal,
    iva,
    total: conceptsTotal + iva,
    costoReal: realCost,
    utilidad: conceptsTotal - realCost,
  };
}
