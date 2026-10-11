export const COLOR_DICTIONARY: Record<string, string> = {
  "AZUL": "#1E3A8A",
  "AZUL CLARO": "#60A5FA",
  "AZUL MARINO": "#1e293b",
  "ROJO": "#DC2626",
  "NEGRO": "#171717",
  "BLANCO": "#FFFFFF",
  "PLATA": "#D4D4D8",
  "GRIS": "#71717A",
  "NARANJA": "#EA580C",
  "VERDE": "#16A34A",
  "VERDE CLARO": "#86EFAC",
  "AMARILLO": "#FACC15",
  "ROSA": "#F472B6",
  "MORADO": "#9333EA",
  "CAFE": "#78350F",
  "BEIGE": "#F5F5DC",
  "ACERO": "#9ca3af",
  "DORADO": "#CA8A04",
  "MULTICOLOR": "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)"
};

export function getHexForColor(colorName: string | null | undefined): string {
  if (!colorName) return "#ccc";
  const cleanColor = colorName.replace(/^\d+\s*-\s*/, '').trim().toUpperCase();
  return COLOR_DICTIONARY[cleanColor] || "#ccc";
}

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
