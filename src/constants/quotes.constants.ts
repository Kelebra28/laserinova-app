/**
 * Constantes y mapeos de estados para Cotizaciones y Pagos
 */

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
  DONE: "Completada"
};

export const QUOTE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  SENT: "bg-blue-100 text-blue-800 border-blue-200",
  ACCEPTED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-zinc-100 text-zinc-800 border-zinc-200",
  DONE: "bg-purple-100 text-purple-800 border-purple-200"
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PARTIAL: "Abono",
  PAID: "Pagado",
  REFUNDED: "Reembolsado"
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-orange-100 text-orange-800 border-orange-200",
  PARTIAL: "bg-blue-100 text-blue-800 border-blue-200",
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REFUNDED: "bg-red-100 text-red-800 border-red-200"
};
