/**
 * Funciones de formato de moneda y números para toda la aplicación
 */

export function formatNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "0";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0";
  return num.toLocaleString("es-MX");
}

export function formatCurrency(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "$0.00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "$0.00";
  return `$${num.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Pesos sin decimales por defecto: $1,234 (con `decimals` para tooltips: $1,234.50). */
export function formatMoney(n: number, decimals = 0): string {
  const abs = Math.abs(n).toLocaleString("es-MX", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${n < 0 ? "-" : ""}$${abs}`;
}

/** Pesos abreviados para ejes de gráficas: $1.2k */
export function formatMoneyCompact(n: number): string {
  return Math.abs(n) >= 1000 ? `$${(n / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })}k` : `$${n}`;
}

export function formatPercent(n: number | null | undefined, decimals = 0): string {
  return n === null || n === undefined ? "—" : `${n.toFixed(decimals)}%`;
}

/** Duración a partir de minutos: <1 min · 35 min · 2.5 h · 3.1 d */
export function formatDuration(mins: number | null): string {
  if (mins === null) return "—";
  if (mins < 1) return "<1 min";
  if (mins < 60) return `${Math.round(mins)} min`;
  if (mins < 1440) return `${(mins / 60).toFixed(1)} h`;
  return `${(mins / 1440).toFixed(1)} d`;
}

/** Hora de 24 h a formato corto: 15 → "3 pm" */
export function formatHour(h: number): string {
  return `${h % 12 || 12} ${h < 12 ? "am" : "pm"}`;
}

const SHORT_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-11-03" → "03 nov" */
export function formatShortDate(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${d} ${SHORT_MONTHS[Number(m) - 1] ?? m}`;
}
