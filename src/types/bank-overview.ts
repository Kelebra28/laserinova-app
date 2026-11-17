import type { ParsedStatement } from "@/types/bank-statement";
import type { BankLine } from "@/types/reconciliation";
import type { OverviewMode } from "@/constants/bank-overview.constants";

/** Estado de cuenta ya leído, con el nombre del archivo del que salió. */
export type LoadedStatement = ParsedStatement & { fileName: string; /** id en la base de datos cuando el estado ya está guardado. */ storedId?: string };

export type OverviewOptions = {
  /** "all" o el número de cuenta completo. */
  account: string;
  mode: OverviewMode;
  /** Solo aplica en "all": quita las transferencias entre cuentas propias para no contar el dinero dos veces. */
  excludeTransfers: boolean;
};

export type VerificationStatus = "ok" | "warn" | "calculated";

export type OverviewRow = {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  /** Saldo al final del periodo (null si algún estado no lo trae). */
  closingBalance: number | null;
  status: VerificationStatus;
  /** Por qué no cuadra, qué falta o cómo se calculó. */
  notes: string[];
  statements: number;
};

export type AccountSummary = { id: string; last4: string; product: string; holder: string | null; statements: number; from: string; to: string; closingBalance: number | null };

export type InternalTransfer = {
  id: string;
  date: string;
  amount: number;
  description: string;
  last4: string;
  reason: "pair" | "holder";
  /** La otra punta de la transferencia, cuando la hay en otro estado subido. */
  counterpart: string | null;
};

export type ContinuityIssue = { kind: "gap" | "balance" | "checks" | "duplicate"; accountId: string | null; message: string };

export type OverviewTotals = {
  income: number;
  expense: number;
  net: number;
  /** Suma del último saldo de cada cuenta incluida. */
  closingBalance: number | null;
  /** Fecha del último estado incluido (yyyy-mm-dd). */
  closingDate: string | null;
};

export type Overview = {
  accounts: AccountSummary[];
  rows: OverviewRow[];
  totals: OverviewTotals;
  transfers: InternalTransfer[];
  /** Cuántas transferencias se están excluyendo de los totales en esta vista. */
  excludedCount: number;
  issues: ContinuityIssue[];
  /** Renglones que cuentan en esta vista (para la gráfica de cargos). */
  lines: BankLine[];
};
