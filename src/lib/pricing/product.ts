import { GLOBAL_COST_DEFAULTS, pickProductPricing } from "./config";

/**
 * Precio de productos de catálogo (Doble Vela / PromoOpción) con escalas por cantidad:
 *   costo del proveedor (sin IVA) → + IVA → ÷ (1 − margen según cantidad) = precio sin factura.
 * Si el cliente factura, el IVA de venta se suma al final sobre ese precio (lo hace la cotización).
 */

type ConfigMap = Record<string, number | undefined>;

export type PricedProduct = { unitCost?: number | null; unitPrice?: number | null; provider?: string | null; model?: string | null };

/** % de margen que corresponde a la cantidad pedida. */
export function getProductMarginPct(qty: number, g: ConfigMap): number {
  const c = pickProductPricing(g);
  const q = Number(qty) || 1;
  if (q >= c.producto_escala_3) return c.margen_producto_3;
  if (q >= c.producto_escala_2) return c.margen_producto_2;
  return c.margen_producto_1;
}

export interface ProductTierPrice {
  costWithIva: number; // costo por pieza con IVA (base del margen)
  margin: number;      // % de margen aplicado según cantidad
  price: number;       // precio unitario sin factura (sin IVA de venta)
  minProfitApplied: boolean; // true si el piso de ganancia mínima subió el precio
}

export function calculateProductTierPrice(supplierUnitCost: number, qty: number, g: ConfigMap): ProductTierPrice {
  const c = pickProductPricing(g);
  const ivaFactor = 1 + (g.porcentaje_iva ?? GLOBAL_COST_DEFAULTS.porcentaje_iva) / 100;
  const cost = Number(supplierUnitCost) || 0;
  const costWithIva = c.proveedor_incluye_iva ? cost : cost * ivaFactor;
  const margin = Math.min(getProductMarginPct(qty, g), 99);
  const byMargin = costWithIva > 0 ? costWithIva / ((100 - margin) / 100) : 0;
  const byMinProfit = costWithIva > 0 ? costWithIva + Math.max(c.ganancia_minima_pieza, 0) : 0;
  const price = Math.max(byMargin, byMinProfit);
  return {
    costWithIva: Math.round(costWithIva * 100) / 100,
    margin,
    price: Math.round(price * 100) / 100,
    minProfitApplied: byMinProfit > byMargin,
  };
}

// Productos que se sincronizan con el proveedor: su precio de venta guardado NO es manual (es un resto del sync).
const SUPPLIER_PROVIDERS = ["doble vela", "promoopcion", "promo opcion", "promo opción"];

export function isSupplierSyncedProduct(product: { provider?: string | null }): boolean {
  return SUPPLIER_PROVIDERS.includes((product.provider ?? "").trim().toLowerCase());
}

/** Clave proveedor+modelo: todos los colores de un modelo comparten precio. */
export function modelCostKey(product: { provider?: string | null; model?: string | null }): string {
  return `${(product.provider ?? "").trim().toLowerCase()}|${(product.model ?? "").trim().toLowerCase()}`;
}

/** Costo más alto entre los colores del mismo modelo (si no hay modelo, el costo del propio producto). */
export function maxCostOfModel(product: PricedProduct, all: PricedProduct[]): number {
  const own = Number(product.unitCost) || 0;
  if (!product.model) return own;
  const key = modelCostKey(product);
  let max = own;
  for (const p of all) {
    if (modelCostKey(p) === key) max = Math.max(max, Number(p.unitCost) || 0);
  }
  return max;
}

/** Un producto tiene precio manual cuando NO viene del proveedor y su precio de venta es distinto al costo. */
export function hasManualProductPrice(product: PricedProduct): boolean {
  if (isSupplierSyncedProduct(product)) return false;
  const price = Number(product.unitPrice) || 0;
  const cost = Number(product.unitCost) || 0;
  return price > 0 && Math.abs(price - cost) > 0.001;
}

/**
 * Precio unitario de un producto para una cantidad dada.
 * Respeta el precio manual; si no lo tiene, aplica las escalas por cantidad
 * usando el costo más alto de los colores del modelo (modelMaxCost) y la ganancia mínima por pieza.
 */
export function resolveProductUnitPrice(
  product: PricedProduct,
  qty: number,
  g: ConfigMap,
  modelMaxCost?: number
): { unitCost: number; unitPrice: number; margin: number | null; tiered: boolean } {
  const ownCost = Number(product.unitCost) || 0;
  const supplierCost = Math.max(ownCost, Number(modelMaxCost) || 0);
  if (hasManualProductPrice(product)) {
    return { unitCost: ownCost, unitPrice: Number(product.unitPrice) || 0, margin: null, tiered: false };
  }
  if (supplierCost <= 0) {
    return { unitCost: 0, unitPrice: Number(product.unitPrice) || 0, margin: null, tiered: false };
  }
  const t = calculateProductTierPrice(supplierCost, qty, g);
  return { unitCost: t.costWithIva, unitPrice: t.price, margin: t.margin, tiered: true };
}
