/** Estados de un movimiento del banco guardado. */
export const MOVEMENT_STATES = ["PENDIENTE", "GASTO", "COBRO", "IGNORADO"] as const;
export type MovementState = (typeof MOVEMENT_STATES)[number];

/** Categoría de Finanzas para cada categoría de cargo del banco (las de `EXPENSE_CATEGORIES`). */
export const CHARGE_EXPENSE_CATEGORY: Record<string, string> = {
  bank: "Impuestos / Contabilidad",
  insurance: "Otros",
  cash: "Otros",
  ads: "Marketing / Publicidad",
  software: "Software / Suscripciones",
  fuel: "Gasolina",
  shipping: "Paquetería / Envíos",
  supplies: "Materiales",
  food: "Viáticos",
  online: "Otros",
  transfers: "Otros",
  other: "Otros",
};

/** Máximo de movimientos que se registran o ignoran en una sola operación. */
export const MOVEMENTS_BATCH_MAX = 500;
/** Máximo de renglones por estado al guardarlo. */
export const STATEMENT_MAX_LINES = 3000;
