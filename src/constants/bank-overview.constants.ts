/**
 * Constantes del panorama bancario (ingresos, egresos y saldos de varios estados de cuenta).
 */

export const OVERVIEW_MODES = [
  { id: "statement", label: "Periodo del estado" },
  { id: "calendar", label: "Mes calendario" },
] as const;
export type OverviewMode = (typeof OVERVIEW_MODES)[number]["id"];
export const OVERVIEW_DEFAULT_MODE: OverviewMode = "statement";
export const OVERVIEW_ALL_ACCOUNTS = "all";

/** Días de diferencia aceptados entre las dos puntas de una transferencia entre cuentas propias. */
export const TRANSFER_PAIR_DAYS = 2;
/** Palabras del nombre del titular que deben aparecer en el concepto para marcar una transferencia propia. */
export const TRANSFER_HOLDER_MIN_TOKENS = 2;
export const TRANSFER_HOLDER_MIN_TOKEN_LENGTH = 4;
/** Diferencia aceptada al comparar saldos (centavos de redondeo). */
export const OVERVIEW_BALANCE_TOLERANCE = 0.011;
export const OVERVIEW_MAX_FILES = 24;

export const OVERVIEW_TEXTS = {
  calendarBalance: "Saldo calculado con los movimientos; los meses calendario no coinciden con los cortes del banco.",
  partialMonth: "Mes incompleto: solo hay estados de",
  duplicate: "está repetido: se usó una sola vez.",
  transfersOnlyAll: "En una sola cuenta las transferencias propias sí cuentan, porque entran o salen de esa cuenta.",
} as const;
