/**
 * Configuración de costos del cotizador.
 *
 * Los valores viven en la tabla CostConfiguration (pantalla de Configuración). Este archivo es la
 * única fuente de sus valores por defecto: cuando una clave no existe en la base, se usa el de aquí.
 */

/** Costos globales que usan las fórmulas de corte, grabado y totales. */
export interface GlobalCosts {
  costo_minuto_mayoreo: number;
  costo_minuto_menudeo: number;
  precio_tubo: number;
  vida_util_tubo: number;
  factor_miedo: number;
  porcentaje_iva: number;
  factor_guarda_default: number; // legado: solo para materiales viejos con precio por cm²
  porcentaje_transporte_material: number;
  porcentaje_merma_corte: number;
  margen_default: number;
  factor_produccion_default: number;
  [key: string]: number;
}

export const GLOBAL_COST_DEFAULTS = {
  costo_minuto_mayoreo: 8.5,
  costo_minuto_menudeo: 10,
  precio_tubo: 250000,
  vida_util_tubo: 6000,
  factor_miedo: 2,
  porcentaje_iva: 16,
  factor_guarda_default: 1.2,
  porcentaje_transporte_material: 20,
  porcentaje_merma_corte: 20,
  margen_default: 50,
  factor_produccion_default: 3,
} as const;

/** Costos por día del servicio en sitio (se pueden sobrescribir por concepto). */
export const SERVICE_SITE_DEFAULTS = {
  costo_operador_sitio: 1500,
  costo_transporte_sitio: 1500,
  costo_instalacion_sitio: 1000,
  costo_equipo_laser_sitio: 3500,
  costo_consumibles_sitio: 1000,
  costo_viaticos_sitio: 1300,
  horas_jornada: 8,
  margen_pct: 30,
} as const;

/** Precio de productos de catálogo: márgenes por escala de cantidad. */
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

type ConfigMap = Record<string, number | undefined>;

/** Extrae la configuración de precios de producto de un mapa key→valor, con valores por defecto (0 es válido). */
export function pickProductPricing(g: ConfigMap = {}): ProductPricingConfig {
  const out = { ...PRODUCT_PRICING_DEFAULTS } as Record<string, number>;
  for (const key of Object.keys(PRODUCT_PRICING_DEFAULTS)) {
    const v = g[key];
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
  }
  return out as unknown as ProductPricingConfig;
}

/**
 * Arma los costos globales a partir del mapa key→valor de la base.
 * En los costos de corte un valor vacío o en 0 se toma como "sin configurar" y usa el de defecto;
 * en los de producto el 0 sí es válido (ver pickProductPricing). Las demás claves pasan tal cual.
 */
export function buildGlobalCosts(map: ConfigMap = {}): GlobalCosts {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(map)) {
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
  }
  for (const [key, fallback] of Object.entries(GLOBAL_COST_DEFAULTS)) {
    out[key] = map[key] || fallback;
  }
  return { ...out, ...pickProductPricing(map) } as unknown as GlobalCosts;
}

/** Convierte filas de CostConfiguration en un mapa key→valor. */
export function toConfigMap(rows: { key: string; value: number }[]): Record<string, number> {
  const map: Record<string, number> = {};
  rows.forEach((r) => { map[r.key] = r.value; });
  return map;
}
