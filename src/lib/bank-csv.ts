import Papa from "papaparse";
import { BANK_HEADER_SYNONYMS, SPANISH_MONTHS, type BankField } from "@/constants/reconciliation.constants";
import type { BankLine, ColumnMapping, NormalizeReport, ParsedCsv } from "@/types/reconciliation";

/** Minúsculas, sin acentos ni signos: "Descripción " → "descripcion". */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Monto a número. Entiende $1,234.56 · 1.234,56 · (500.00) · 500.00- · "−". null si no es monto. */
export function parseAmount(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let s = raw.trim();
  if (!s || s === "-") return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/-\s*$/.test(s)) negative = true;
  if (/^[-−–]/.test(s)) negative = true;
  s = s.replace(/[^\d.,]/g, "");
  if (!s || !/\d/.test(s)) return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    // El último separador es el decimal.
    s = lastDot > lastComma ? s.replace(/,/g, "") : s.replace(/\./g, "").replace(",", ".");
  } else if (lastComma >= 0) {
    s = /,\d{1,2}$/.test(s) && s.indexOf(",") === lastComma ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return negative ? -n : n;
}

const pad = (n: number) => String(n).padStart(2, "0");
const validDate = (y: number, m: number, d: number) => y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;

/** Fecha a yyyy-mm-dd. Entiende 2026-11-05 · 05/11/2026 · 05-11-26 · 05 NOV 2026 · 05/nov/2026. Día antes que mes. */
export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/[T\s]\d{1,2}:\d{2}.*$/, "");
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m && validDate(+m[1], +m[2], +m[3])) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    if (validDate(y, +m[2], +m[1])) return `${y}-${pad(+m[2])}-${pad(+m[1])}`;
  }
  m = normalizeText(s).match(/^(\d{1,2}) ([a-z]{3,4}) (\d{2}|\d{4})$/);
  if (m && SPANISH_MONTHS[m[2]]) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    if (validDate(y, SPANISH_MONTHS[m[2]], +m[1])) return `${y}-${pad(SPANISH_MONTHS[m[2]])}-${pad(+m[1])}`;
  }
  return null;
}

/** Fila del encabezado: la primera con una columna de fecha y otra de descripción/monto/cargo/abono. */
export function findHeaderRow(rows: string[][]): number {
  const isSyn = (cell: string, field: BankField) => BANK_HEADER_SYNONYMS[field].some((syn) => normalizeText(cell) === syn);
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const row = rows[i];
    const hasDate = row.some((c) => isSyn(c, "date"));
    const hasOther = row.some((c) => (["description", "debit", "credit", "amount"] as BankField[]).some((f) => isSyn(c, f)));
    if (hasDate && hasOther) return i;
  }
  return -1;
}

/** Adivina qué columna es cada campo a partir de los títulos. */
export function detectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  const fields = Object.keys(BANK_HEADER_SYNONYMS) as BankField[];
  for (const pass of ["exact", "contains"] as const) {
    for (const field of fields) {
      if (mapping[field] !== undefined) continue;
      const idx = headers.findIndex((h, i) => {
        if (used.has(i)) return false;
        const n = normalizeText(h);
        return BANK_HEADER_SYNONYMS[field].some((syn) => (pass === "exact" ? n === syn : n.includes(syn)));
      });
      if (idx >= 0) {
        mapping[field] = idx;
        used.add(idx);
      }
    }
  }
  return mapping;
}

/** Lee el texto del CSV (cualquier separador), encuentra el encabezado y propone las columnas. */
export function parseBankCsv(text: string): ParsedCsv {
  const clean = text.replace(/^﻿/, "");
  const { data } = Papa.parse<string[]>(clean, { skipEmptyLines: "greedy" });
  const rows = (data as string[][]).map((r) => r.map((c) => (c ?? "").trim()));
  const headerRow = findHeaderRow(rows);
  const headers = headerRow >= 0 ? rows[headerRow] : [];
  return { rows, headerRow, headers, mapping: headerRow >= 0 ? detectMapping(headers) : {} };
}

/** Convierte las filas en renglones del banco con signo (abono +, cargo −). */
export function normalizeLines(rows: string[][], headerRow: number, mapping: ColumnMapping): NormalizeReport {
  const warnings: string[] = [];
  const lines: BankLine[] = [];
  let skipped = 0;
  const { date, description, debit, credit, amount, balance } = mapping;
  if (date === undefined) return { lines, skipped, warnings: ["Falta elegir la columna de fecha."] };
  if (amount === undefined && debit === undefined && credit === undefined) return { lines, skipped, warnings: ["Falta elegir la columna de monto, o las de cargos y abonos."] };

  let sawNegative = false;
  rows.slice(headerRow + 1).forEach((row, i) => {
    const d = parseDate(row[date]);
    let value: number | null = null;
    if (debit !== undefined || credit !== undefined) {
      const cr = credit !== undefined ? parseAmount(row[credit]) : null;
      const db = debit !== undefined ? parseAmount(row[debit]) : null;
      if (cr) value = Math.abs(cr);
      if (db) value = (value ?? 0) - Math.abs(db);
    } else if (amount !== undefined) {
      value = parseAmount(row[amount]);
    }
    if (!d || value === null || value === 0) {
      skipped++; // encabezados repetidos, totales, renglones vacíos
      return;
    }
    if (value < 0) sawNegative = true;
    lines.push({
      id: `B${i + 1}`,
      date: d,
      description: description !== undefined ? row[description] || "" : "",
      amount: Math.round(value * 100) / 100,
      balance: balance !== undefined ? parseAmount(row[balance]) : null,
    });
  });

  if (amount !== undefined && debit === undefined && credit === undefined && lines.length > 0 && !sawNegative) {
    warnings.push("Ningún monto viene con signo negativo: se tomó todo como dinero que entra. Si el banco separa cargos y abonos, elige esas dos columnas.");
  }
  if (lines.length === 0) warnings.push("No se encontró ningún renglón con fecha y monto válidos. Revisa las columnas elegidas.");
  return { lines, skipped, warnings };
}
