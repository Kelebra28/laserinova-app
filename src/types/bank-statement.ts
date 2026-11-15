import type { BankLine } from "@/types/reconciliation";

/** Fragmento de texto de una página de PDF con su posición (x de izquierda a derecha, y de arriba hacia abajo). */
export type PdfTextItem = { text: string; x0: number; x1: number; y: number };
export type PdfPage = PdfTextItem[];

export type StatementCheck = { label: string; ok: boolean; detail: string };

/** Estado de cuenta leído de un PDF, con las comprobaciones contra los totales que el propio banco imprime. */
export type ParsedStatement = {
  bank: string;
  product: string;
  accountLast4: string | null;
  /** Número de cuenta completo (identifica la cuenta aunque se suban varios estados). */
  accountId: string | null;
  /** Nombre del titular (sirve para reconocer transferencias entre cuentas propias). */
  holder: string | null;
  openingBalance: number | null;
  closingBalance: number | null;
  period: { from: string; to: string } | null;
  lines: BankLine[];
  checks: StatementCheck[];
  warnings: string[];
};
