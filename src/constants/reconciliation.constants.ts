/**
 * Constantes de la conciliación bancaria: tolerancias, límites, sinónimos de columnas de los CSV
 * de los bancos y textos de la pantalla.
 */

/** Días de diferencia aceptados entre la fecha del banco y la del sistema. */
export const RECON_DATE_TOLERANCE_DAYS = 5;
/** Diferencia de monto aceptada (centavos de redondeo). */
export const RECON_AMOUNT_TOLERANCE = 0.01;
/** Días extra a cada lado del estado de cuenta para buscar pareja en el sistema. */
export const RECON_SYSTEM_BUFFER_DAYS = 7;
/** Cuántos movimientos se pueden juntar para igualar un solo renglón (1 depósito = 2 cobros). */
export const RECON_COMBO_SIZE = 2;
export const RECON_MAX_LINES = 5000;
export const RECON_MAX_FILE_BYTES = 2_000_000;
/** Medios de pago que nunca pasan por el banco. */
export const RECON_CASH_METHODS = ["efectivo"];
/** Palabras cortas que no sirven para comparar textos. */
export const RECON_MIN_TOKEN_LENGTH = 4;
export const RECON_PAGE_SIZE = 25;
export const RECON_PREVIEW_ROWS = 5;

export type BankField = "date" | "description" | "debit" | "credit" | "amount" | "balance";

export const BANK_FIELD_LABELS: Record<BankField, string> = {
  date: "Fecha",
  description: "Descripción",
  debit: "Cargos (salidas)",
  credit: "Abonos (entradas)",
  amount: "Monto (con signo)",
  balance: "Saldo",
};

/** Nombres con los que los bancos suelen titular cada columna (sin acentos, en minúsculas). */
export const BANK_HEADER_SYNONYMS: Record<BankField, string[]> = {
  date: ["fecha", "fecha operacion", "fecha de operacion", "fecha mov", "fecha movimiento", "fecha valor", "fecha contable", "fecha de movimiento", "date"],
  description: ["descripcion", "concepto", "detalle", "descripcion detallada", "movimiento", "leyenda", "referencia", "description"],
  debit: ["cargo", "cargos", "retiro", "retiros", "debito", "debitos", "debe", "egreso", "egresos", "salida", "salidas"],
  credit: ["abono", "abonos", "deposito", "depositos", "credito", "creditos", "haber", "ingreso", "ingresos", "entrada", "entradas"],
  amount: ["monto", "importe", "cantidad", "amount"],
  balance: ["saldo", "balance", "saldo final"],
};

export const SPANISH_MONTHS: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, sept: 9, set: 9, oct: 10, nov: 11, dic: 12,
  jan: 1, apr: 4, aug: 8, dec: 12,
};

export const RECON_TABS = [
  { key: "matched", label: "Conciliados", hint: "El banco y el sistema coinciden en monto y fecha." },
  { key: "bankOnly", label: "Solo en el banco", hint: "Hay dinero en el estado de cuenta que no está registrado en el sistema: probablemente falta capturarlo." },
  { key: "systemOnly", label: "Solo en el sistema", hint: "Está registrado en el sistema pero no aparece en el banco: puede ser un depósito que aún no llega, un error de captura o un movimiento duplicado." },
  { key: "cash", label: "Efectivo", hint: "Pagos en efectivo: nunca aparecen en el banco, no se concilian." },
] as const;
export type ReconTabKey = (typeof RECON_TABS)[number]["key"];

/* ───────────── Sugerencias depósito → cotización ───────────── */

/** Porcentaje de anticipo habitual del taller (el más fuerte). */
export const SUGGEST_MAIN_ADVANCE_PERCENT = 50;
/** Otros anticipos posibles (sugerencia más débil). */
export const SUGGEST_OTHER_ADVANCE_PERCENTS = [30, 40, 60, 70];
export const SUGGEST_AMOUNT_TOLERANCE = 0.05;
export const SUGGEST_MIN_SCORE = 50;
export const SUGGEST_MAX_PER_LINE = 3;
/** Máximo de cotizaciones que un solo depósito puede cubrir. */
export const SUGGEST_MAX_COMBO = 3;
/** Cuántas cotizaciones abiertas de un mismo cliente se combinan al buscar la suma (clientes grandes tienen muchas). */
export const SUGGEST_MAX_QUOTES_PER_CLIENT = 60;
/** Cotizaciones abiertas que se mandan a la pantalla para elegir a mano. */
export const SUGGEST_OPEN_QUOTES_LIMIT = 400;

export const SUGGEST_SCORES = {
  settle: 90,
  advanceMain: 85,
  full: 80,
  multi: 70,
  /** Cada cotización extra en una combinación baja la confianza: es más fácil que sume por casualidad. */
  multiExtraPenalty: 10,
  noTax: 60,
  /** Abono libre (ni 50% ni saldo): solo vale con una pista de texto, por eso arranca bajo. */
  partial: 30,
  projectTwoTokens: 35,
  projectOneToken: 25,
  advanceOther: 55,
  folioInText: 40,
  clientTwoTokens: 35,
  clientOneToken: 25,
  approved: 5,
};

export const SUGGEST_KIND_LABELS = {
  full: "Pago total",
  settle: "Liquidación (saldo)",
  advance: "Anticipo",
  multi: "Varias cotizaciones",
  partial: "Abono parcial",
} as const;

/** Estados de cotización que pueden recibir un cobro. */
export const SUGGEST_QUOTE_STATUSES = ["SENT", "CALCULATED", "APPROVED", "ACCEPTED", "IN_PRODUCTION", "DELIVERED", "DONE"];
export const SUGGEST_APPROVED_STATUSES = ["APPROVED", "ACCEPTED", "IN_PRODUCTION", "DELIVERED", "DONE"];

/** Marca que se guarda en las notas del movimiento para reconocer un renglón del banco ya conciliado. */
export const BANK_FINGERPRINT_PREFIX = "BANK:";
export const BANK_PAYMENT_METHOD = "transferencia";

/* ───────────── Colores de las gráficas de conciliación ───────────── */
export const RECON_COLORS = {
  matched: "#10b981",
  bankOnly: "#f59e0b",
  systemOnly: "#6b7280",
  cash: "#d1d5db",
  bank: "#111827",
  system: "#9ca3af",
  difference: "#f59e0b",
};
export const RECON_ALLOCATION_TOLERANCE = 0.01;

/* ───────────── Lectura de estados de cuenta en PDF ───────────── */

/** Un poco menos que el límite de 5 MB de los server actions (next.config), por el sobrecosto del formulario. */
export const PDF_MAX_FILE_BYTES = 4_500_000;
/** Dos fragmentos de texto cuya altura difiere menos que esto están en el mismo renglón. */
export const PDF_LINE_TOLERANCE = 2.5;
/** Centavos de diferencia aceptados al comparar contra los totales del banco. */
export const PDF_TOTAL_TOLERANCE = 0.011;
/** Meses abreviados en mayúsculas como los imprime BBVA (26/OCT). */
export const PDF_MONTH_CODES: Record<string, number> = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12 };
export const PDF_MAX_PAGES = 60;

/* ───────────── Filtros del detalle ───────────── */

export const RECON_SORT_OPTIONS = [
  { id: "date-asc", label: "Fecha ↑" },
  { id: "date-desc", label: "Fecha ↓" },
  { id: "amount-desc", label: "Monto ↓" },
  { id: "amount-asc", label: "Monto ↑" },
] as const;
export type ReconSort = (typeof RECON_SORT_OPTIONS)[number]["id"];

export const RECON_KIND_OPTIONS = [
  { id: "all", label: "Todo" },
  { id: "in", label: "Depósitos" },
  { id: "out", label: "Cargos" },
] as const;
export type ReconKind = (typeof RECON_KIND_OPTIONS)[number]["id"];

/** Valores de los campos tal como se escriben (texto); la lógica los convierte. */
export type ReconFilters = { text: string; kind: ReconKind; min: string; max: string; from: string; to: string; sort: ReconSort };
export const DEFAULT_RECON_FILTERS: ReconFilters = { text: "", kind: "all", min: "", max: "", from: "", to: "", sort: "date-asc" };

/* ───────────── Cargos: categorías y comercios ─────────────
 * Reglas en orden: gana la primera que coincide. Son texto de los estados de BBVA; se pueden ampliar aquí. */

export const CHARGE_CATEGORIES: { key: string; label: string; pattern: RegExp }[] = [
  { key: "bank", label: "Comisiones e IVA del banco", pattern: /APLI\s+TASA|IVA\s+TASA|COMISION|COMIS\b|MANEJO\s+DE\s+CUENTA/i },
  { key: "insurance", label: "Seguros", pattern: /PRIMA\s+DE\s+SEGURO|SEGURO/i },
  { key: "cash", label: "Retiros en cajero", pattern: /RETIRO\s+CAJERO|RET\s+CAJ|DISPOSICION\s+EFECTIVO/i },
  { key: "ads", label: "Publicidad", pattern: /PUBLICITAR|FACEBK|META\s+ADS|GOOGLE\s*\*?\s*ADS|TIKTOK\s+ADS/i },
  { key: "software", label: "Software y suscripciones", pattern: /OPENAI|CHATGPT|MICROSOFT|GOOGLE|ADOBE|CANVA|APPLE\.COM|NETFLIX|SPOTIFY|DROPBOX|ZOOM|FIGMA|GITHUB|VERCEL|HOSTINGER/i },
  { key: "fuel", label: "Gasolina", pattern: /^(SERV|GAS)\b|GASOLIN|PEMEX|COMBUSTIBLE|ESTACION\s+DE\s+SERVICIO/i },
  { key: "shipping", label: "Paquetería y envíos", pattern: /GUIA:|ESTAFETA|DHL|FEDEX|REDPACK|99\s*MINUTOS|PAQUETEXPRESS|SKYDROPX/i },
  { key: "supplies", label: "Materiales y papelería", pattern: /HOME\s+DEPOT|OFFICE\s+DEPOT|TLAPALER|ACRILFRASA|ACRIPLAS|EMPACK|ENVASE|SUPPLY|FERRETER|PAPELER|MATERIAL|LUMEN|ACRILICO|GRABADO/i },
  { key: "food", label: "Comida y restaurantes", pattern: /STARBUCKS|MCDONALD|MAISON|REST\b|RESTAURANT|CAFE|PIZZA|TACOS|SUSHI|ANTOJITOS|CITY\s+MARKET|SANBORN|7\s*ELEVEN|OXXO|WALMART|SORIANA|COSTCO|LIVERPOOL/i },
  { key: "online", label: "Compras en línea", pattern: /OPENPAY|MERPAGO|MERCADO\s*\*?\s*PAGO|MERCADOLIBRE|AMAZON|AMZN|PAYPAL|CLIP\s*MX/i },
  { key: "transfers", label: "Transferencias a terceros", pattern: /PAGO\s+CUENTA\s+DE\s+TERCERO|SPEI\s+ENVIADO|TRASPASO|TRANSFERENCIA/i },
];
export const CHARGE_OTHER_CATEGORY = { key: "other", label: "Otros" };
/** Encabezados que no dicen a quién se pagó: ahí el comercio es el concepto que escribió quien pagó. */
export const GENERIC_CHARGE_HEADS = /^(PAGO\s+CUENTA\s+DE\s+TERCERO|SPEI\s+ENVIADO|TRASPASO|TRANSFERENCIA)/i;
export const CHARGE_TOP_MERCHANTS = 10;
