import type { BankLine, ReconMatch, SystemMovement } from "@/types/reconciliation";

/** Un renglón del archivo exportado. */
export type ExportRow = { list: string; date: string; description: string; amount: number; type: string; counterpart: string };

const HEADER = ["Lista", "Fecha", "Descripción", "Monto", "Tipo", "Contraparte"];

const kind = (amount: number) => (amount >= 0 ? "Depósito" : "Cargo");

export const matchesToRows = (matches: ReconMatch[], list = "Conciliado"): ExportRow[] =>
  matches.map((m) => {
    const amount = Math.round(m.bank.reduce((s, b) => s + b.amount, 0) * 100) / 100;
    return {
      list,
      date: m.bank[0]?.date ?? "",
      description: m.bank.map((b) => b.description).join(" + "),
      amount,
      type: kind(amount),
      counterpart: `Sistema: ${m.system.map((s) => `${s.date} ${s.description}`).join(" + ")}${m.previous ? " (conciliado antes)" : ""}`,
    };
  });

export const linesToRows = (items: (BankLine | SystemMovement)[], list: string, counterpart = ""): ExportRow[] =>
  items.map((l) => ({ list, date: l.date, description: l.description, amount: l.amount, type: kind(l.amount), counterpart }));

/** Evita que Excel interprete como fórmula un texto que empieza con = + - @ (el banco o el pagador lo escriben). */
export const safe = (text: string) => (/^[=+\-@\t\r]/.test(text) ? `'${text}` : text);
export const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** Texto del CSV: una fila por renglón, con la lista de la que viene. Abre bien en Excel (UTF-8 con BOM). */
export function buildReconCsv(rows: ExportRow[]): string {
  const body = rows.map((r) => [r.list, r.date, safe(r.description), r.amount.toFixed(2), r.type, safe(r.counterpart)].map(cell).join(","));
  return "﻿" + [HEADER.map(cell).join(","), ...body].join("\n");
}

/** Descarga el texto como archivo (solo en el navegador). */
export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
