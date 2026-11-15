import { RECON_AMOUNT_TOLERANCE, RECON_DATE_TOLERANCE_DAYS, RECON_MIN_TOKEN_LENGTH } from "@/constants/reconciliation.constants";
import { normalizeText } from "@/lib/bank-csv";
import type { BankLine, DailyPoint, ReconCore, ReconMatch, SystemMovement } from "@/types/reconciliation";

/**
 * Compara el estado de cuenta contra los movimientos del sistema. Solo calcula: no escribe nada.
 * 1) Pareja uno a uno: mismo signo, mismo monto (±1 centavo) y fecha dentro de la tolerancia.
 *    Gana la pareja con fecha más cercana y texto más parecido (cliente, proveedor, folio).
 * 2) Con lo que sobra, junta dos renglones: un depósito que paga dos cobros, o un cobro que el banco partió en dos.
 */

const DAY = 86_400_000;
const dayNum = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
};
const sameSign = (a: number, b: number) => a > 0 === b > 0;
const cents = (n: number) => Math.round(Math.abs(n) * 100);

const tokens = (s: string) =>
  new Set(
    normalizeText(s)
      .split(" ")
      .filter((t) => t.length >= RECON_MIN_TOKEN_LENGTH && !/^\d{1,4}$/.test(t)),
  );
const textScore = (a: string, b: string) => {
  const ta = tokens(a);
  let n = 0;
  for (const t of tokens(b)) if (ta.has(t)) n++;
  return n;
};

type Options = {
  dateToleranceDays?: number;
  amountTolerance?: number;
  /** Periodo que cubre el estado de cuenta (si el banco lo imprime): los movimientos del sistema dentro de él se revisan aunque no haya renglones ese día. */
  period?: { from: string; to: string };
  /** Renglones del banco ya conciliados antes (id del renglón → ids de los movimientos que lo cubren). */
  preMatched?: Record<string, string[]>;
};

export function reconcile(bank: BankLine[], system: SystemMovement[], options: Options = {}): ReconCore {
  const tolDays = options.dateToleranceDays ?? RECON_DATE_TOLERANCE_DAYS;
  const tolAmt = options.amountTolerance ?? RECON_AMOUNT_TOLERANCE;

  const dates = [...bank.map((b) => b.date), ...(options.period ? [options.period.from, options.period.to] : [])].sort();
  const from = dates[0] ?? "";
  const to = dates[dates.length - 1] ?? "";
  const inRange = (s: SystemMovement) => s.date >= from && s.date <= to;

  const bankSystem = system.filter((s) => !s.isCash);
  const cash = system.filter((s) => s.isCash && inRange(s)).sort((a, b) => a.date.localeCompare(b.date));

  const bankUsed = new Set<string>();
  const sysUsed = new Set<string>();
  const matches: ReconMatch[] = [];

  // ── Ya conciliados en una subida anterior (traen su marca en el movimiento) ──
  const sysById = new Map(bankSystem.map((s) => [s.id, s]));
  for (const b of bank) {
    const list = (options.preMatched?.[b.id] ?? []).map((id) => sysById.get(id)).filter((s): s is SystemMovement => !!s && !sysUsed.has(s.id));
    if (list.length === 0) continue;
    bankUsed.add(b.id);
    list.forEach((s) => sysUsed.add(s.id));
    matches.push({ bank: [b], system: list, previous: true, dayDiff: Math.max(...list.map((s) => Math.abs(dayNum(b.date) - dayNum(s.date)))), confidence: "high" });
  }

  // ── 1 a 1 ────────────────────────────────────────────────────────────────
  const byCents = new Map<number, SystemMovement[]>();
  for (const s of bankSystem) {
    const k = cents(s.amount);
    byCents.set(k, [...(byCents.get(k) ?? []), s]);
  }
  type Pair = { b: BankLine; s: SystemMovement; dd: number; text: number; score: number };
  const pairs: Pair[] = [];
  for (const b of bank) {
    if (bankUsed.has(b.id)) continue;
    const k = cents(b.amount);
    for (const key of [k - 1, k, k + 1]) {
      for (const s of byCents.get(key) ?? []) {
        if (sysUsed.has(s.id)) continue;
        if (!sameSign(b.amount, s.amount) || Math.abs(Math.abs(b.amount) - Math.abs(s.amount)) > tolAmt + 1e-9) continue;
        const dd = Math.abs(dayNum(b.date) - dayNum(s.date));
        if (dd > tolDays) continue;
        const text = textScore(b.description, s.detail);
        pairs.push({ b, s, dd, text, score: dd * 10 - Math.min(text, 3) * 4 });
      }
    }
  }
  pairs.sort((x, y) => x.score - y.score);
  for (const p of pairs) {
    if (bankUsed.has(p.b.id) || sysUsed.has(p.s.id)) continue;
    bankUsed.add(p.b.id);
    sysUsed.add(p.s.id);
    matches.push({ bank: [p.b], system: [p.s], dayDiff: p.dd, confidence: p.dd <= 2 || p.text > 0 ? "high" : "medium" });
  }

  // ── Dos renglones contra uno ─────────────────────────────────────────────
  const freeBank = () => bank.filter((b) => !bankUsed.has(b.id));
  const freeSys = () => bankSystem.filter((s) => !sysUsed.has(s.id));

  for (const b of freeBank()) {
    const cand = freeSys().filter((s) => sameSign(b.amount, s.amount) && Math.abs(s.amount) < Math.abs(b.amount) && Math.abs(dayNum(b.date) - dayNum(s.date)) <= tolDays);
    let best: { combo: SystemMovement[]; dd: number } | null = null;
    for (let i = 0; i < cand.length; i++) {
      for (let j = i + 1; j < cand.length; j++) {
        if (Math.abs(Math.abs(cand[i].amount) + Math.abs(cand[j].amount) - Math.abs(b.amount)) > tolAmt * 2) continue;
        const dd = Math.max(Math.abs(dayNum(b.date) - dayNum(cand[i].date)), Math.abs(dayNum(b.date) - dayNum(cand[j].date)));
        if (!best || dd < best.dd) best = { combo: [cand[i], cand[j]], dd };
      }
    }
    if (best) {
      bankUsed.add(b.id);
      best.combo.forEach((s) => sysUsed.add(s.id));
      matches.push({ bank: [b], system: best.combo, dayDiff: best.dd, confidence: "medium" });
    }
  }
  for (const s of freeSys()) {
    const cand = freeBank().filter((b) => sameSign(b.amount, s.amount) && Math.abs(b.amount) < Math.abs(s.amount) && Math.abs(dayNum(b.date) - dayNum(s.date)) <= tolDays);
    let best: { combo: BankLine[]; dd: number } | null = null;
    for (let i = 0; i < cand.length; i++) {
      for (let j = i + 1; j < cand.length; j++) {
        if (Math.abs(Math.abs(cand[i].amount) + Math.abs(cand[j].amount) - Math.abs(s.amount)) > tolAmt * 2) continue;
        const dd = Math.max(Math.abs(dayNum(s.date) - dayNum(cand[i].date)), Math.abs(dayNum(s.date) - dayNum(cand[j].date)));
        if (!best || dd < best.dd) best = { combo: [cand[i], cand[j]], dd };
      }
    }
    if (best) {
      sysUsed.add(s.id);
      best.combo.forEach((b) => bankUsed.add(b.id));
      matches.push({ bank: best.combo, system: [s], dayDiff: best.dd, confidence: "medium" });
    }
  }

  matches.sort((a, b) => a.bank[0].date.localeCompare(b.bank[0].date));
  const bankOnly = bank.filter((b) => !bankUsed.has(b.id)).sort((a, b) => a.date.localeCompare(b.date));
  const systemOnly = bankSystem.filter((s) => !sysUsed.has(s.id) && inRange(s)).sort((a, b) => a.date.localeCompare(b.date));

  const sumIf = (xs: { amount: number }[], pos: boolean) => xs.filter((x) => x.amount > 0 === pos).reduce((s, x) => s + Math.abs(x.amount), 0);
  const sysInRange = bankSystem.filter(inRange);

  // Neto por día en el banco y en el sistema.
  const dayMap = new Map<string, DailyPoint>();
  const point = (date: string) => dayMap.get(date) ?? dayMap.set(date, { date, bank: 0, system: 0 }).get(date)!;
  for (const b of bank) point(b.date).bank += b.amount;
  for (const s of sysInRange) point(s.date).system += s.amount;
  const daily = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ ...d, bank: Math.round(d.bank * 100) / 100, system: Math.round(d.system * 100) / 100 }));

  return {
    from,
    to,
    daily,
    matches,
    bankOnly,
    systemOnly,
    cash,
    totals: {
      bankIn: sumIf(bank, true),
      bankOut: sumIf(bank, false),
      systemIn: sumIf(sysInRange, true),
      systemOut: sumIf(sysInRange, false),
      matchedCount: matches.length,
      matchedAmount: matches.reduce((s, m) => s + m.bank.reduce((a, b) => a + Math.abs(b.amount), 0), 0),
    },
  };
}
