/** Estilos y etiquetas completos de los estados reales de una cotización (lista y tablero). */
export const STATUS_STYLES: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: "Borrador", badge: "bg-gray-100 text-gray-700" },
  CALCULATED: { label: "Calculada", badge: "bg-cyan-50 text-cyan-700" },
  SENT: { label: "Enviada", badge: "bg-blue-50 text-blue-700" },
  APPROVED: { label: "Aprobada", badge: "bg-purple-50 text-purple-700" },
  IN_PRODUCTION: { label: "En proceso", badge: "bg-orange-50 text-orange-700" },
  DELIVERED: { label: "Entregada", badge: "bg-emerald-50 text-emerald-700" },
  CANCELLED: { label: "Cancelada", badge: "bg-red-50 text-red-700" },
  REJECTED: { label: "Rechazada", badge: "bg-red-50 text-red-700" },
};

export const PAYMENT_STYLES: Record<string, { label: string; badge: string }> = {
  PENDING: { label: "Por cobrar", badge: "bg-amber-50 text-amber-700" },
  PARTIAL: { label: "Anticipo", badge: "bg-sky-50 text-sky-700" },
  PAID: { label: "Pagado", badge: "bg-emerald-50 text-emerald-700" },
};

export function daysAgo(date: string | Date): number {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
}

export function ageLabel(date: string | Date): string {
  const d = daysAgo(date);
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 30) return `hace ${d} d`;
  const m = Math.floor(d / 30);
  return `hace ${m} mes${m === 1 ? "" : "es"}`;
}
