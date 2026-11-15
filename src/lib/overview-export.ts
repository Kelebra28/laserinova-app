import { cell, safe } from "@/lib/reconciliation-export";
import type { OverviewRow } from "@/types/bank-overview";

const STATUS_TEXT = { ok: "Cuadra con el estado", warn: "Revisar", calculated: "Calculado" } as const;

/** Tabla "Por mes" a CSV (UTF-8 con BOM para Excel). */
export function buildOverviewCsv(rows: OverviewRow[]): string {
  const header = ["Periodo", "Ingresos", "Egresos", "Neto", "Saldo final", "Verificación", "Notas"].map(cell).join(",");
  const body = rows.map((r) =>
    [r.label, r.income.toFixed(2), r.expense.toFixed(2), r.net.toFixed(2), r.closingBalance === null ? "" : r.closingBalance.toFixed(2), STATUS_TEXT[r.status], safe(r.notes.join(" | "))].map(cell).join(","),
  );
  return "﻿" + [header, ...body].join("\n");
}
