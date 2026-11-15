import {
  OVERVIEW_BALANCE_TOLERANCE,
  OVERVIEW_ALL_ACCOUNTS,
  OVERVIEW_TEXTS,
  TRANSFER_HOLDER_MIN_TOKEN_LENGTH,
  TRANSFER_HOLDER_MIN_TOKENS,
  TRANSFER_PAIR_DAYS,
} from "@/constants/bank-overview.constants";
import { normalizeText } from "@/lib/bank-csv";
import { formatShortDate } from "@/constants/formatters.constants";
import type { BankLine } from "@/types/reconciliation";
import type { AccountSummary, ContinuityIssue, InternalTransfer, LoadedStatement, Overview, OverviewOptions, OverviewRow, OverviewTotals } from "@/types/bank-overview";

/**
 * Panorama de varios estados de cuenta. Todo es una función pura sobre los estados ya leídos:
 * no consulta ni guarda nada. Agrupa por estado o por mes calendario, junta cuentas sin contar dos veces las
 * transferencias entre cuentas propias y comprueba que no falte ningún estado (periodos y saldos continuos).
 */

const DAY = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const dayNum = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
};
const addDays = (ymd: string, n: number) => new Date((dayNum(ymd) + n) * DAY).toISOString().slice(0, 10);
const monthKey = (ymd: string) => ymd.slice(0, 7);
const endOfMonth = (key: string) => addDays(`${addMonth(key)}-01`, -1);
const addMonth = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};
const monthLabel = (key: string) => {
  const t = new Date(`${key}-01T12:00:00Z`).toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
  return (t.charAt(0).toUpperCase() + t.slice(1)).replace(" de ", " ");
};
const accountKey = (s: LoadedStatement) => s.accountId ?? `archivo:${s.fileName}`;
const stmtName = (s: LoadedStatement) => `…${s.accountLast4 ?? "????"}`;

type Mv = { id: string; si: number; account: string; last4: string; date: string; amount: number; description: string; holder: string | null };

/** Quita estados repetidos (misma cuenta y mismo periodo) y los que no traen periodo. */
export function dedupeStatements(statements: LoadedStatement[]): { unique: LoadedStatement[]; issues: ContinuityIssue[] } {
  const seen = new Set<string>();
  const unique: LoadedStatement[] = [];
  const issues: ContinuityIssue[] = [];
  for (const s of statements) {
    if (!s.period) continue;
    const key = `${accountKey(s)}|${s.period.from}|${s.period.to}`;
    if (seen.has(key)) {
      issues.push({ kind: "duplicate", accountId: s.accountId, message: `${s.fileName} ${OVERVIEW_TEXTS.duplicate}` });
      continue;
    }
    seen.add(key);
    unique.push(s);
  }
  return { unique, issues };
}

const movementsOf = (unique: LoadedStatement[]): Mv[] =>
  unique.flatMap((s, si) => s.lines.map((l) => ({ id: `${si}:${l.id}`, si, account: accountKey(s), last4: s.accountLast4 ?? "????", date: l.date, amount: l.amount, description: l.description, holder: s.holder })));

const holderTokens = (holder: string | null) => normalizeText(holder ?? "").split(" ").filter((t) => t.length >= TRANSFER_HOLDER_MIN_TOKEN_LENGTH);

/**
 * Transferencias entre cuentas propias. Dos señales:
 *  - pareja: un abono en una cuenta y un cargo del mismo monto en otra cuenta subida, con pocos días de diferencia;
 *  - titular: el concepto menciona el nombre del titular ("TRANSFERENCIA A JUAN PEREZ").
 */
export function detectInternalTransfers(unique: LoadedStatement[]): Map<string, { reason: "pair" | "holder"; counterpart: string | null }> {
  const mvs = movementsOf(unique);
  const flagged = new Map<string, { reason: "pair" | "holder"; counterpart: string | null }>();

  const credits = mvs.filter((m) => m.amount > 0).sort((a, b) => a.date.localeCompare(b.date));
  const debits = mvs.filter((m) => m.amount < 0);
  for (const c of credits) {
    let best: Mv | null = null;
    let bestDiff = Infinity;
    for (const d of debits) {
      if (flagged.has(d.id) || d.account === c.account) continue;
      if (Math.abs(Math.abs(d.amount) - c.amount) > 0.01) continue;
      const diff = Math.abs(dayNum(d.date) - dayNum(c.date));
      if (diff <= TRANSFER_PAIR_DAYS && diff < bestDiff) {
        best = d;
        bestDiff = diff;
      }
    }
    if (best) {
      flagged.set(c.id, { reason: "pair", counterpart: `${best.last4} · ${best.description}` });
      flagged.set(best.id, { reason: "pair", counterpart: `${c.last4} · ${c.description}` });
    }
  }

  for (const m of mvs) {
    if (flagged.has(m.id)) continue;
    const tokens = holderTokens(m.holder);
    if (tokens.length === 0) continue;
    const concept = normalizeText(m.description.includes(" · ") ? m.description.split(" · ").slice(1).join(" ") : m.description);
    const hits = tokens.filter((t) => concept.includes(t)).length;
    if (hits >= Math.min(TRANSFER_HOLDER_MIN_TOKENS, tokens.length)) flagged.set(m.id, { reason: "holder", counterpart: null });
  }
  return flagged;
}

/** Por cuenta: los periodos deben ser seguidos y el saldo final de uno debe ser el saldo inicial del siguiente. */
export function checkContinuity(unique: LoadedStatement[]): { issues: ContinuityIssue[]; notesByStatement: Map<number, string[]> } {
  const issues: ContinuityIssue[] = [];
  const notes = new Map<number, string[]>();
  const note = (si: number, text: string) => notes.set(si, [...(notes.get(si) ?? []), text]);

  unique.forEach((s, si) => {
    for (const c of s.checks) if (!c.ok) {
      const text = `${stmtName(s)}: ${c.label} no cuadra con el estado (${c.detail})`;
      issues.push({ kind: "checks", accountId: s.accountId, message: text });
      note(si, text);
    }
  });

  const byAccount = new Map<string, number[]>();
  unique.forEach((s, si) => byAccount.set(accountKey(s), [...(byAccount.get(accountKey(s)) ?? []), si]));
  for (const idxs of byAccount.values()) {
    const sorted = [...idxs].sort((a, b) => unique[a].period!.from.localeCompare(unique[b].period!.from));
    for (let i = 1; i < sorted.length; i++) {
      const prev = unique[sorted[i - 1]];
      const cur = unique[sorted[i]];
      const expectedFrom = addDays(prev.period!.to, 1);
      if (cur.period!.from !== expectedFrom) {
        const missing = cur.period!.from > expectedFrom ? `Falta el estado del ${formatShortDate(expectedFrom)} al ${formatShortDate(addDays(cur.period!.from, -1))}` : "Los periodos se traslapan";
        const text = `${stmtName(cur)}: ${missing}`;
        issues.push({ kind: "gap", accountId: cur.accountId, message: text });
        note(sorted[i], text);
      } else if (prev.closingBalance !== null && cur.openingBalance !== null && Math.abs(prev.closingBalance - cur.openingBalance) > OVERVIEW_BALANCE_TOLERANCE) {
        const text = `${stmtName(cur)}: el saldo final del estado anterior no coincide con el saldo inicial de este`;
        issues.push({ kind: "balance", accountId: cur.accountId, message: text });
        note(sorted[i], text);
      }
    }
  }
  return { issues, notesByStatement: notes };
}

function summarizeAccounts(unique: LoadedStatement[]): AccountSummary[] {
  const map = new Map<string, number[]>();
  unique.forEach((s, si) => map.set(accountKey(s), [...(map.get(accountKey(s)) ?? []), si]));
  return [...map.entries()]
    .map(([id, idxs]) => {
      const list = idxs.map((i) => unique[i]).sort((a, b) => a.period!.from.localeCompare(b.period!.from));
      const last = list[list.length - 1];
      return { id, last4: last.accountLast4 ?? "????", product: last.product, holder: last.holder, statements: list.length, from: list[0].period!.from, to: last.period!.to, closingBalance: last.closingBalance };
    })
    .sort((a, b) => a.last4.localeCompare(b.last4));
}

export function buildOverview(statements: LoadedStatement[], options: OverviewOptions): Overview {
  const { unique, issues: dupIssues } = dedupeStatements(statements);
  const accounts = summarizeAccounts(unique);
  const { issues: contIssues, notesByStatement } = checkContinuity(unique);
  const flagged = detectInternalTransfers(unique);

  const all = options.account === OVERVIEW_ALL_ACCOUNTS;
  const included = unique.map((s, si) => ({ s, si })).filter(({ s }) => all || accountKey(s) === options.account);
  const mvs = movementsOf(unique).filter((m) => included.some((i) => i.si === m.si));
  const excluded = new Set(all && options.excludeTransfers ? [...flagged.keys()] : []);
  const counted = mvs.filter((m) => !excluded.has(m.id));

  const transfers: InternalTransfer[] = mvs
    .filter((m) => flagged.has(m.id))
    .map((m) => ({ id: m.id, date: m.date, amount: m.amount, description: m.description, last4: m.last4, reason: flagged.get(m.id)!.reason, counterpart: flagged.get(m.id)!.counterpart }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const inRange = (m: Mv, from: string, to: string) => m.date >= from && m.date <= to;
  const sums = (list: Mv[]) => ({ income: round2(list.filter((m) => m.amount > 0).reduce((s, m) => s + m.amount, 0)), expense: round2(list.filter((m) => m.amount < 0).reduce((s, m) => s + Math.abs(m.amount), 0)) });

  let rows: OverviewRow[] = [];
  if (options.mode === "statement") {
    const groups = new Map<string, number[]>();
    for (const { s, si } of included) groups.set(monthKey(s.period!.to), [...(groups.get(monthKey(s.period!.to)) ?? []), si]);
    rows = [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, idxs]) => {
        const list = counted.filter((m) => idxs.includes(m.si));
        const { income, expense } = sums(list);
        const closings = idxs.map((i) => unique[i].closingBalance);
        const rowNotes = idxs.flatMap((i) => notesByStatement.get(i) ?? []);
        return { key, label: monthLabel(key), income, expense, net: round2(income - expense), closingBalance: closings.some((c) => c === null) ? null : round2(closings.reduce<number>((s, c) => s + (c ?? 0), 0)), status: rowNotes.length ? "warn" : "ok", notes: rowNotes, statements: idxs.length } as OverviewRow;
      });
  } else if (included.length > 0) {
    const dates = included.flatMap(({ s }) => [s.period!.from, s.period!.to]).sort();
    const coverFrom = dates[0];
    const coverTo = dates[dates.length - 1];
    // Saldo de cada cuenta al cierre de una fecha: saldo inicial + todos los movimientos hasta esa fecha.
    const accountIds = [...new Set(included.map(({ s }) => accountKey(s)))];
    const balanceAt = (date: string) =>
      accountIds.reduce((total, id) => {
        const sts = included.filter(({ s }) => accountKey(s) === id).sort((a, b) => a.s.period!.from.localeCompare(b.s.period!.from));
        const opening = sts[0].s.openingBalance;
        if (opening === null) return NaN;
        return total + opening + mvs.filter((m) => m.account === id && m.date <= date).reduce((s, m) => s + m.amount, 0);
      }, 0);
    for (let key = monthKey(coverFrom); key <= monthKey(coverTo); key = addMonth(key)) {
      const start = `${key}-01`;
      const end = endOfMonth(key);
      const { income, expense } = sums(counted.filter((m) => inRange(m, start, end)));
      const rowNotes: string[] = [OVERVIEW_TEXTS.calendarBalance];
      if (start < coverFrom || end > coverTo) rowNotes.push(`${OVERVIEW_TEXTS.partialMonth} ${formatShortDate(coverFrom)} al ${formatShortDate(coverTo)}.`);
      const sIdxs = included.filter(({ s }) => s.period!.from <= end && s.period!.to >= start).map((i) => i.si);
      const problems = sIdxs.flatMap((i) => notesByStatement.get(i) ?? []);
      const bal = balanceAt(end);
      rows.push({ key, label: monthLabel(key), income, expense, net: round2(income - expense), closingBalance: isNaN(bal) ? null : round2(bal), status: problems.length ? "warn" : "calculated", notes: [...problems, ...rowNotes], statements: sIdxs.length });
    }
  }

  const accountsIncluded = accounts.filter((a) => all || a.id === options.account);
  const closings = accountsIncluded.map((a) => a.closingBalance);
  const totals: OverviewTotals = {
    income: round2(rows.reduce((s, r) => s + r.income, 0)),
    expense: round2(rows.reduce((s, r) => s + r.expense, 0)),
    net: round2(rows.reduce((s, r) => s + r.net, 0)),
    closingBalance: accountsIncluded.length && !closings.some((c) => c === null) ? round2(closings.reduce<number>((s, c) => s + (c ?? 0), 0)) : null,
    closingDate: accountsIncluded.length ? accountsIncluded.map((a) => a.to).sort().pop()! : null,
  };

  const lines: BankLine[] = counted.map((m) => ({ id: m.id, date: m.date, description: m.description, amount: m.amount, balance: null }));
  const issues = [...dupIssues, ...contIssues].filter((i) => all || i.accountId === null || i.accountId === options.account || i.kind === "duplicate");
  return { accounts, rows, totals, transfers, excludedCount: excluded.size, issues, lines };
}
