/**
 * Única fuente de verdad de los estados de una cotización y de su cobro.
 * `Quote.status` y `Quote.paymentStatus` son String en Prisma: cualquier valor fuera de estas
 * listas es un dato inválido (el servidor lo rechaza en updateQuoteStatusService).
 */

export const QUOTE_STATUSES = [
  "DRAFT",
  "CALCULATED",
  "SENT",
  "APPROVED",
  "IN_PRODUCTION",
  "DELIVERED",
  "REJECTED",
  "CANCELLED",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export type QuoteStatusStyle = {
  label: string;
  /** Badge suave para listas y tablas. */
  badge: string;
  /** Chip con borde (detalle de la cotización y botones de estado). */
  chip: string;
  /** Punto de color (tablero kanban). */
  dot: string;
  /** Brillo del punto en el tablero. */
  glow: string;
};

export const QUOTE_STATUS: Record<QuoteStatus, QuoteStatusStyle> = {
  DRAFT: {
    label: "Borrador",
    badge: "bg-gray-100 text-gray-700",
    chip: "bg-gray-100 text-gray-800 border-gray-200",
    dot: "bg-gray-500",
    glow: "shadow-[0_0_8px_rgba(107,114,128,0.5)]",
  },
  CALCULATED: {
    label: "Calculada",
    badge: "bg-cyan-50 text-cyan-700",
    chip: "bg-cyan-100 text-cyan-800 border-cyan-200",
    dot: "bg-cyan-500",
    glow: "shadow-[0_0_8px_rgba(6,182,212,0.5)]",
  },
  SENT: {
    label: "Enviada",
    badge: "bg-blue-50 text-blue-700",
    chip: "bg-blue-100 text-blue-800 border-blue-200",
    dot: "bg-blue-500",
    glow: "shadow-[0_0_8px_rgba(59,130,246,0.5)]",
  },
  APPROVED: {
    label: "Aprobada",
    badge: "bg-purple-50 text-purple-700",
    chip: "bg-purple-100 text-purple-800 border-purple-200",
    dot: "bg-purple-500",
    glow: "shadow-[0_0_8px_rgba(168,85,247,0.5)]",
  },
  IN_PRODUCTION: {
    label: "En proceso",
    badge: "bg-orange-50 text-orange-700",
    chip: "bg-orange-100 text-orange-800 border-orange-200",
    dot: "bg-orange-500",
    glow: "shadow-[0_0_8px_rgba(249,115,22,0.5)]",
  },
  DELIVERED: {
    label: "Entregada",
    badge: "bg-emerald-50 text-emerald-700",
    chip: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    glow: "shadow-[0_0_8px_rgba(16,185,129,0.5)]",
  },
  REJECTED: {
    label: "Rechazada",
    badge: "bg-red-50 text-red-700",
    chip: "bg-red-100 text-red-800 border-red-200",
    dot: "bg-red-500",
    glow: "shadow-[0_0_8px_rgba(239,68,68,0.5)]",
  },
  CANCELLED: {
    label: "Cancelada",
    badge: "bg-red-50 text-red-700",
    chip: "bg-zinc-100 text-zinc-800 border-zinc-200",
    dot: "bg-red-500",
    glow: "shadow-[0_0_8px_rgba(239,68,68,0.5)]",
  },
};

export function isQuoteStatus(value: unknown): value is QuoteStatus {
  return typeof value === "string" && (QUOTE_STATUSES as readonly string[]).includes(value);
}

/** Estilo de un estado; si llega un valor desconocido se muestra tal cual en gris. */
export function quoteStatusStyle(status: string | null | undefined): QuoteStatusStyle {
  if (isQuoteStatus(status)) return QUOTE_STATUS[status];
  return { ...QUOTE_STATUS.DRAFT, label: status || "—" };
}

export const PAYMENT_STATUSES = ["PENDING", "PARTIAL", "PAID", "REFUNDED"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type PaymentStatusStyle = { label: string; badge: string; chip: string };

export const PAYMENT_STATUS: Record<PaymentStatus, PaymentStatusStyle> = {
  PENDING: {
    label: "Por cobrar",
    badge: "bg-amber-50 text-amber-700",
    chip: "bg-orange-100 text-orange-800 border-orange-200",
  },
  PARTIAL: {
    label: "Anticipo",
    badge: "bg-sky-50 text-sky-700",
    chip: "bg-blue-100 text-blue-800 border-blue-200",
  },
  PAID: {
    label: "Pagado",
    badge: "bg-emerald-50 text-emerald-700",
    chip: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  REFUNDED: {
    label: "Reembolsado",
    badge: "bg-red-50 text-red-700",
    chip: "bg-red-100 text-red-800 border-red-200",
  },
};

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === "string" && (PAYMENT_STATUSES as readonly string[]).includes(value);
}

/** Estilo del cobro; vacío o desconocido cuenta como "Por cobrar" (el default en la BD). */
export function paymentStatusStyle(status: string | null | undefined): PaymentStatusStyle {
  return isPaymentStatus(status) ? PAYMENT_STATUS[status] : PAYMENT_STATUS.PENDING;
}
