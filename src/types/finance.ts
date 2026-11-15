/** Tipos de la pantalla de Finanzas. Los datos salen de finance.service (solo se re-exportan tipos). */
export type { FinanceOverview } from "@/server/services/finance.service";

/** Un renglón de "Movimientos del mes": transacción real o cobro de una cotización (virtual). */
export type FinanceMovement = {
  id: string;
  type: string;
  category: string;
  amount: number;
  taxAmount: number;
  description: string;
  notes?: string | null;
  date: Date;
  paymentMethod?: string | null;
  provider?: string | null;
  status: string;
  isVirtual?: boolean;
  quote?: { folio: string; project: string } | null;
  client?: { name: string } | null;
  createdBy?: { name: string } | null;
};
