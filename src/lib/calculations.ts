// Tipos de cálculo soportados
export type CalculationType = "CORTE" | "GRABADO" | "IMPRESION" | "PRODUCTO" | "OTRO" | "RESALE" | "SERVICIO_SITIO";

export interface GlobalCosts {
  costo_minuto_mayoreo: number;
  costo_minuto_menudeo: number;
  precio_tubo: number;
  vida_util_tubo: number;
  factor_miedo: number;
  porcentaje_iva: number;
  factor_guarda_default: number; // legacy fallback
  porcentaje_transporte_material: number;
  porcentaje_merma_corte: number;
  margen_default: number;
  factor_produccion_default: number;
  [key: string]: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Precio de productos de catálogo (Doble Vela / PromoOpción) con escalas por cantidad
// costo proveedor (sin IVA) → + IVA → / (1 − margen según cantidad) = precio sin factura.
// Si el cliente factura, el IVA se suma al final sobre ese precio (lo hace la cotización).
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductPricingConfig {
  margen_producto_1: number;     // % margen de 1 hasta (escala_2 − 1) piezas
  margen_producto_2: number;     // % margen de escala_2 hasta (escala_3 − 1) piezas
  margen_producto_3: number;     // % margen de escala_3 en adelante
  producto_escala_2: number;     // piezas donde inicia la 2ª escala
  producto_escala_3: number;     // piezas donde inicia la 3ª escala
  proveedor_incluye_iva: number; // 1 = el costo del proveedor ya trae IVA, 0 = viene sin IVA
  ganancia_minima_pieza: number; // $ mínimos de ganancia por pieza (sobre el costo con IVA)
}

export const PRODUCT_PRICING_DEFAULTS: ProductPricingConfig = {
  margen_producto_1: 50,
  margen_producto_2: 40,
  margen_producto_3: 30,
  producto_escala_2: 50,
  producto_escala_3: 200,
  proveedor_incluye_iva: 0,
  ganancia_minima_pieza: 1,
};

/** Extrae la configuración de precios de producto de un mapa key→valor, con valores por defecto (0 es válido). */
export function pickProductPricing(g: Record<string, number | undefined> = {}): ProductPricingConfig {
  const out = { ...PRODUCT_PRICING_DEFAULTS } as Record<string, number>;
  for (const key of Object.keys(PRODUCT_PRICING_DEFAULTS)) {
    const v = g[key];
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
  }
  return out as unknown as ProductPricingConfig;
}

export function getProductMarginPct(qty: number, g: Record<string, number | undefined>): number {
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

export function calculateProductTierPrice(
  supplierUnitCost: number,
  qty: number,
  g: Record<string, number | undefined>
): ProductTierPrice {
  const c = pickProductPricing(g);
  const ivaFactor = 1 + ((g.porcentaje_iva ?? 16) / 100);
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

type PricedProduct = { unitCost?: number | null; unitPrice?: number | null; provider?: string | null; model?: string | null };

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
  g: Record<string, number | undefined>,
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

export interface MaterialData {
  length?: number | null;
  width?: number | null;
  sheetPrice?: number | null;
  guardPercentage?: number | null;
  pricePerCm2?: number | null;
}

export interface CalculationInput {
  type: CalculationType;
  quantity: number;
  
  // Para CORTE, GRABADO
  material?: MaterialData;
  clientProvidesMaterial?: boolean;
  partWidth?: number;
  partHeight?: number;
  timeMin?: number;
  isWholesale?: boolean; // Mayoreo o menudeo
  
  // Para IMPRESION, PRODUCTO, OTRO, RESALE
  // Para IMPRESION, PRODUCTO, OTRO, RESALE
  manualUnitPrice?: number;
  manualCost?: number;
  
  // Para SERVICIO_SITIO
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

export interface CalculationResult {
  materialBaseCost: number; // Costo sin merma
  materialWastageCost: number; // Solo el 50% de merma
  materialCost: number; // Total material (base + merma)
  productionCost: number; // Costo de máquina
  realCost: number; // Total (materialCost + productionCost)
  suggestedPrice: number;
}


export function calculateConcept(input: CalculationInput, globals: GlobalCosts): CalculationResult {
  let materialBaseCost = 0;
  let materialWastageCost = 0;
  let materialCost = 0;
  let productionCost = 0;
  let realCost = 0;
  let suggestedPrice = 0;

  // Parámetros para la nueva fórmula de máquina
  const tubePrice = globals.precio_tubo || 250000;
  const tubeLifeHours = globals.vida_util_tubo || 6000;
  const fearFactor = globals.factor_miedo || 2;
  const prodFactor = globals.factor_produccion_default || 3;

  // 1. Calcular costo de material si aplica (CORTE o GRABADO)
  if ((input.type === "CORTE" || input.type === "GRABADO") && input.material && input.partWidth && input.partHeight) {
    if (!input.clientProvidesMaterial) {
      const transportFactor = 1 + ((globals.porcentaje_transporte_material ?? 20) / 100);
      const mermaPercent = (globals.porcentaje_merma_corte ?? 20) / 100;
      
      let purePriceCm2 = 0;

      // Si tenemos los datos de la hoja completa (lo más exacto)
      if (input.material.sheetPrice && input.material.length && input.material.width) {
        // La hoja YA incluye IVA en el inventario según el usuario, solo aplicamos Transporte
        const sheetWithTransport = input.material.sheetPrice * transportFactor;
        
        const areaHoja = input.material.length * input.material.width;
        purePriceCm2 = sheetWithTransport / areaHoja;
      } 
      // Fallback para materiales viejos que solo tenían pricePerCm2 (legacy)
      else if (input.material.pricePerCm2) {
        const oldGuardFactor = input.material.guardPercentage || globals.factor_guarda_default || 1.2;
        // Extraemos el base original sin Guarda. (Asumimos que ya trae IVA como es su nuevo estándar)
        const baseSinNada = input.material.pricePerCm2 / oldGuardFactor;
        // Ahora lo convertimos al nuevo modelo (solo aplicando transporte)
        purePriceCm2 = baseSinNada * transportFactor;
      }
      
      if (purePriceCm2 > 0) {
        const areaPieza = input.partWidth * input.partHeight;
        
        // El materialBaseCost es el costo de la pieza YA INCLUYENDO Iva y Transporte
        materialBaseCost = areaPieza * purePriceCm2;
        
        // Y a esa pieza le sumamos su propia Merma de corte
        materialWastageCost = materialBaseCost * mermaPercent; 
        
        materialCost = materialBaseCost + materialWastageCost;
      }
    }
  }

  // 2. Calcular según el tipo
  switch (input.type) {
    case "CORTE":
    case "GRABADO":
      const totalTime = input.timeMin || 0;

      // --- NUEVA FÓRMULA DE MÁQUINA ---
      // 1. Costo base por minuto (vida del tubo)
      // (Precio Tubo / Horas Vida) / 60 min
      const baseMinCost = (tubePrice / tubeLifeHours) / 60;
      
      // 2. Costo puro del corte para esta pieza
      const pureCutCost = totalTime * baseMinCost;
      
      // 3. Aplicar Factor de Miedo (duplicar) y Factor de Producción (triplicar)
      productionCost = pureCutCost * fearFactor * prodFactor;
      
      // Costo Real = Costo Material + Costo Producción (Operación)
      // Si se proporciona un costo manual, se usa ese (para casos "especiales")
      realCost = input.manualCost || (materialCost + productionCost); 
      
      if (input.isWholesale) {
        // Cálculo por Mayoreo: Costo de Material + (Tiempo * Costo Minuto Mayoreo)
        const mayoreoPrice = materialCost + (totalTime * (globals.costo_minuto_mayoreo || 8.5));
        suggestedPrice = input.manualUnitPrice || mayoreoPrice;
      } else {
        // Cálculo Normal: Precio Sugerido = Costo Total / (1 - Margen)
        let marginDefault = globals.margen_default || 50;
        if (marginDefault >= 100) marginDefault = 99; // Prevención de división por cero
        const marginFactor = (100 - marginDefault) / 100;
        suggestedPrice = input.manualUnitPrice || (realCost / marginFactor);
      }
      break;

    case "RESALE":
    case "IMPRESION":
    case "PRODUCTO":
    case "OTRO":
      realCost = input.manualCost || 0;
      materialBaseCost = realCost;
      suggestedPrice = input.manualUnitPrice || 0;
      break;

    case "SERVICIO_SITIO":
      const days = input.serviceDays || 0;
      const hours = input.serviceHours ?? 8;
      
      const opCost = input.operatorCost ?? globals.costo_operador_sitio ?? 1500;
      const transCost = input.transportCost ?? globals.costo_transporte_sitio ?? 1500;
      const instCost = input.installCost ?? globals.costo_instalacion_sitio ?? 1000;
      const laserCost = input.laserUseCost ?? globals.costo_equipo_laser_sitio ?? 3500;
      const consCost = input.consumablesCost ?? globals.costo_consumibles_sitio ?? 1000;
      const viatCost = input.viaticsCost ?? globals.costo_viaticos_sitio ?? 1300;
      
      const hourlyRateOp = opCost / 8;
      const hourlyRateLaser = laserCost / 8;
      const hourlyRateConsumables = consCost / 8;
      
      const dailyOp = hourlyRateOp * hours;
      const dailyLaser = hourlyRateLaser * hours;
      const dailyCons = hourlyRateConsumables * hours;
      
      const totalCostPerDay = dailyOp + transCost + instCost + dailyLaser + dailyCons + viatCost;
      const effectiveDays = days > 0 ? days : 1;
      const totalServiceCost = totalCostPerDay * effectiveDays;
      
      // Costo Real = Total de Operación por Día * Días
      // Si se proporciona un costo manual, se usa ese
      realCost = input.manualCost || totalServiceCost;
      
      const customMargin = input.margin ?? 30; // 30% default
      // Ganancia directa (Markup)
      const markupFactor = 1 + (customMargin / 100);
      suggestedPrice = input.manualUnitPrice || (realCost * markupFactor);
      break;

  }


  // Multiplicar por cantidad
  return {
    materialBaseCost: Number((materialBaseCost * input.quantity).toFixed(2)),
    materialWastageCost: Number((materialWastageCost * input.quantity).toFixed(2)),
    materialCost: Number((materialCost * input.quantity).toFixed(2)),
    productionCost: Number((productionCost * input.quantity).toFixed(2)),
    realCost: Number((realCost * input.quantity).toFixed(2)),
    suggestedPrice: Number((suggestedPrice * input.quantity).toFixed(2)),
  };
}


