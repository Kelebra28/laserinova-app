/**
 * Constantes de la pantalla de Finanzas: textos, límites, listas de estados y estilos por tipo de movimiento.
 * Los tipos de movimiento (INCOME_TYPES, EXPENSE_TYPES) y los estados ganados (WON_STATUSES) viven en
 * dashboard.constants.ts para no duplicarlos.
 */

/** Estados que se consideran dentro de la cobranza (el cliente ya aceptó). */
export const FINANCE_COLLECTION_STATUSES = ["APPROVED", "ACCEPTED", "IN_PRODUCTION", "DELIVERED", "DONE"];
/** Estados que nunca entran a cobranza. */
export const FINANCE_EXCLUDED_STATUSES = ["CANCELLED", "REJECTED", "DRAFT"];
/** Una cotización con saldo menor a esto se considera pagada. */
export const FINANCE_PAID_TOLERANCE = 0.01;

/** Roles que pueden usar Finanzas (páginas y acciones). Igual que adminOnly en el middleware. */
export const FINANCE_ALLOWED_ROLES = ["ADMIN"];

export const FINANCE_FORM_QUOTES_LIMIT = 50;
export const FINANCE_BREAKDOWN_TOP = 6;
export const FINANCE_TAX_LABEL = "IVA de ingresos cobrados (16%)";

/** Texto de comparación para el selector de mes. */
export const FINANCE_COMPARISON_LABEL = "vs mes anterior";

/**
 * Estilo de cada tipo de movimiento. Misma regla de color que el dashboard:
 * verde = dinero que entra, rojo = gasto, ámbar = costo de proyecto, gris = ajuste.
 */
export const FINANCE_TYPE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  GASTO_OPERATIVO: { label: "Gasto Op.", color: "text-red-700", bg: "bg-red-50 border-red-100" },
  GASTO_PROYECTO: { label: "Gasto Proy.", color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
  INGRESO: { label: "Ingreso", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
  ANTICIPO: { label: "Anticipo", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
  LIQUIDACION: { label: "Liquidación", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
  AJUSTE: { label: "Ajuste", color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
};
