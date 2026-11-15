import { DEFAULT_RECON_FILTERS, type ReconFilters } from "@/constants/reconciliation.constants";
import { normalizeText } from "@/lib/bank-csv";
import type { BankLine, ReconMatch, SystemMovement } from "@/types/reconciliation";

/**
 * Filtros y orden del detalle. Todo es una función pura sobre los renglones: no consulta nada.
 * Un renglón pasa si cumple TODOS los filtros activos. El texto busca todas las palabras escritas
 * (sin importar acentos ni mayúsculas) en la descripción.
 */

/** Cuántos filtros hay activos (el orden no cuenta como filtro). */
export function activeFilterCount(f: ReconFilters): number {
  return [f.text.trim(), f.kind !== "all", f.min.trim(), f.max.trim(), f.from, f.to].filter(Boolean).length;
}

const num = (s: string): number | null => {
  const n = parseFloat(s.replace(/[,$\s]/g, ""));
  return isNaN(n) ? null : n;
};

type Row = { text: string; amount: number; date: string };

function passes(row: Row, f: ReconFilters): boolean {
  const words = normalizeText(f.text).split(" ").filter(Boolean);
  if (words.length) {
    const hay = normalizeText(row.text);
    if (!words.every((w) => hay.includes(w))) return false;
  }
  if (f.kind === "in" && row.amount <= 0) return false;
  if (f.kind === "out" && row.amount >= 0) return false;
  const abs = Math.abs(row.amount);
  const min = num(f.min);
  const max = num(f.max);
  if (min !== null && abs < min - 0.005) return false;
  if (max !== null && abs > max + 0.005) return false;
  if (f.from && row.date < f.from) return false;
  if (f.to && row.date > f.to) return false;
  return true;
}

function ordered<T>(items: T[], rowOf: (t: T) => Row, sort: ReconFilters["sort"]): T[] {
  const copy = [...items];
  const byDate = (a: T, b: T) => rowOf(a).date.localeCompare(rowOf(b).date);
  const byAmount = (a: T, b: T) => Math.abs(rowOf(a).amount) - Math.abs(rowOf(b).amount);
  if (sort === "date-asc") return copy.sort(byDate);
  if (sort === "date-desc") return copy.sort((a, b) => byDate(b, a));
  if (sort === "amount-desc") return copy.sort((a, b) => byAmount(b, a) || byDate(a, b));
  return copy.sort((a, b) => byAmount(a, b) || byDate(a, b));
}

const lineRow = (l: BankLine | SystemMovement): Row => ({ text: l.description + ("detail" in l ? ` ${l.detail}` : ""), amount: l.amount, date: l.date });
const matchRow = (m: ReconMatch): Row => ({
  text: [...m.bank.map((b) => b.description), ...m.system.map((s) => `${s.description} ${s.detail}`)].join(" "),
  amount: m.bank.reduce((s, b) => s + b.amount, 0),
  date: m.bank[0]?.date ?? m.system[0]?.date ?? "",
});

export const filterLines = <T extends BankLine | SystemMovement>(items: T[], f: ReconFilters = DEFAULT_RECON_FILTERS): T[] => ordered(items.filter((i) => passes(lineRow(i), f)), lineRow, f.sort);
export const filterMatches = (items: ReconMatch[], f: ReconFilters = DEFAULT_RECON_FILTERS): ReconMatch[] => ordered(items.filter((m) => passes(matchRow(m), f)), matchRow, f.sort);
