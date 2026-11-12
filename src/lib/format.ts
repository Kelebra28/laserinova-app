/**
 * Formato de números y dinero para toda la app (es-MX).
 * Valores vacíos o no numéricos se muestran como 0.
 */

function toNumber(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === "") return null;
  const num = typeof val === "string" ? parseFloat(val) : val;
  return Number.isNaN(num) ? null : num;
}

/** 12,345.6 */
export function formatNumber(val: number | string | null | undefined): string {
  const num = toNumber(val);
  return num === null ? "0" : num.toLocaleString("es-MX");
}

/** $12,345.60 (o con los decimales que se pidan: `formatCurrency(n, 0)` → $12,346). */
export function formatCurrency(val: number | string | null | undefined, decimals = 2): string {
  const num = toNumber(val) ?? 0;
  return `$${num.toLocaleString("es-MX", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
