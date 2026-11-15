import type { BankField } from "@/constants/reconciliation.constants";

/** Columna del CSV que corresponde a cada campo (índice). */
export type ColumnMapping = Partial<Record<BankField, number>>;

/** Renglón del estado de cuenta, ya normalizado. Positivo = abono (entra), negativo = cargo (sale). */
export type BankLine = {
  id: string;
  /** yyyy-mm-dd */
  date: string;
  description: string;
  amount: number;
  balance: number | null;
};

/** Movimiento del sistema, con signo: ingresos positivos, gastos negativos. */
export type SystemMovement = {
  id: string;
  date: string;
  amount: number;
  /** Texto para mostrar en la tabla. */
  description: string;
  /** Texto extra (cliente, proveedor, folio) usado para comparar con la descripción del banco. */
  detail: string;
  method: string | null;
  isCash: boolean;
};

export type ReconMatch = {
  bank: BankLine[];
  system: SystemMovement[];
  /** true si este renglón ya se había conciliado en una subida anterior (por su marca en el movimiento). */
  previous?: boolean;
  /** high: monto y fecha cercana (o texto parecido). medium: monto exacto pero fecha lejana o varios renglones. */
  confidence: "high" | "medium";
  dayDiff: number;
};

export type ReconTotals = {
  bankIn: number;
  bankOut: number;
  systemIn: number;
  systemOut: number;
  matchedCount: number;
  matchedAmount: number;
};

/** Cotización que todavía puede recibir cobros. */
export type OpenQuote = {
  id: string;
  folio: string;
  project: string;
  clientId: string | null;
  clientName: string;
  status: string;
  total: number;
  subtotal: number;
  collected: number;
  owed: number;
};

export type SuggestionKind = "full" | "settle" | "advance" | "multi" | "partial";

export type Allocation = {
  quoteId: string;
  folio: string;
  project: string;
  clientName: string;
  /** Cuánto de este depósito va a esta cotización. */
  amount: number;
  /** Qué porcentaje del total de la cotización representa. */
  percentOfTotal: number;
  /** Cómo queda la cotización después de este pago. */
  after: "advance" | "paid";
};

export type Suggestion = {
  kind: SuggestionKind;
  /** Texto corto: "Anticipo del 50%", "Liquidación (saldo)"… */
  label: string;
  score: number;
  allocations: Allocation[];
  reasons: string[];
};

export type DailyPoint = { date: string; bank: number; system: number };

export type ReconResult = ReconCore & {
  /** Sugerencias por id de renglón del banco (solo abonos que no coinciden con ningún movimiento). */
  suggestions: Record<string, Suggestion[]>;
  openQuotes: OpenQuote[];
  /** Marca de cada renglón del banco (se manda de vuelta al registrar un cobro para no duplicarlo). */
  fingerprints: Record<string, string>;
};

/** Lo que calcula la comparación pura (sin consultar cotizaciones). */
export type ReconCore = {
  from: string;
  to: string;
  /** Neto por día (entradas − salidas) en el banco y en el sistema (sin efectivo). */
  daily: DailyPoint[];
  matches: ReconMatch[];
  bankOnly: BankLine[];
  systemOnly: SystemMovement[];
  cash: SystemMovement[];
  totals: ReconTotals;
};

export type ParsedCsv = {
  rows: string[][];
  headerRow: number;
  headers: string[];
  mapping: ColumnMapping;
};

export type NormalizeReport = { lines: BankLine[]; skipped: number; warnings: string[] };

/** Un grupo de cargos (categoría o comercio) con su total. */
export type ChargeGroup = { key: string; label: string; amount: number; count: number; share: number };
export type ChargesBreakdown = { total: number; count: number; byCategory: ChargeGroup[]; byMerchant: ChargeGroup[] };
