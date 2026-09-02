export const QUOTE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  CALCULATED: "Calculada",
  SENT: "Enviada",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  IN_PRODUCTION: "En Producción",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
};

export const QUOTE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  CALCULATED: "bg-blue-100 text-blue-800 border-blue-200",
  SENT: "bg-purple-100 text-purple-800 border-purple-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  IN_PRODUCTION: "bg-orange-100 text-orange-800 border-orange-200",
  DELIVERED: "bg-teal-100 text-teal-800 border-teal-200",
  CANCELLED: "bg-black text-white border-black",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Por cobrar",
  PARTIAL: "Con adelanto",
  PAID: "Pagada",
  REFUNDED: "Reembolsada",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "text-red-600 bg-red-50 border-red-100",
  PARTIAL: "text-orange-600 bg-orange-50 border-orange-100",
  PAID: "text-emerald-600 bg-emerald-50 border-emerald-100",
  REFUNDED: "text-gray-600 bg-gray-50 border-gray-200",
};
