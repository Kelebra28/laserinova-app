/**
 * Fechas "solo día" (fecha límite de una tarea).
 *
 * Se guardan siempre a las 12:00 UTC del día elegido. Así el día calendario es el mismo en
 * cualquier zona horaria de América, y se lee con `slice(0, 10)` o formateando en UTC.
 * Los datos viejos guardados a las 00:00 UTC también se leen bien con este criterio.
 */

/** "2026-11-10" (o un ISO completo) → "2026-11-10T12:00:00.000Z". */
export function toDateOnlyISO(input: string | null | undefined): string | null {
  if (!input) return null;
  const ymd = input.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? `${ymd}T12:00:00.000Z` : null;
}

/** Día de hoy como "YYYY-MM-DD" en la zona horaria indicada (por defecto la del navegador). */
export function todayYMD(timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // en-CA da formato YYYY-MM-DD
}

/** ¿El día de la fecha límite ya pasó? Una tarea que vence hoy NO está vencida. */
export function isDatePast(iso: string | null | undefined, timeZone?: string): boolean {
  if (!iso) return false;
  return iso.slice(0, 10) < todayYMD(timeZone);
}

/** Formatea el día de una fecha límite sin corrimientos por zona horaria. */
export function formatDueDate(
  iso: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }
): string {
  if (!iso) return "";
  return new Date(`${iso.slice(0, 10)}T12:00:00.000Z`).toLocaleDateString("es-MX", { ...options, timeZone: "UTC" });
}

/** Días completos desde una fecha (0 si es hoy o futura). */
export function daysAgo(date: string | Date): number {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
}

/** Antigüedad corta: "hoy", "ayer", "hace 5 d", "hace 2 meses". */
export function ageLabel(date: string | Date): string {
  const d = daysAgo(date);
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 30) return `hace ${d} d`;
  const m = Math.floor(d / 30);
  return `hace ${m} mes${m === 1 ? "" : "es"}`;
}
