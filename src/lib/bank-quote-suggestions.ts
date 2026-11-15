import {
  RECON_MIN_TOKEN_LENGTH,
  SUGGEST_AMOUNT_TOLERANCE,
  SUGGEST_APPROVED_STATUSES,
  SUGGEST_KIND_LABELS,
  SUGGEST_MAIN_ADVANCE_PERCENT,
  SUGGEST_MAX_COMBO,
  SUGGEST_MAX_PER_LINE,
  SUGGEST_MAX_QUOTES_PER_CLIENT,
  SUGGEST_MIN_SCORE,
  SUGGEST_OTHER_ADVANCE_PERCENTS,
  SUGGEST_SCORES,
} from "@/constants/reconciliation.constants";
import { normalizeText } from "@/lib/bank-csv";
import type { Allocation, BankLine, OpenQuote, Suggestion } from "@/types/reconciliation";

/**
 * Propone a qué cotización(es) pertenece un depósito que no está registrado en el sistema.
 * Solo sugiere: nada se registra hasta que la persona confirma.
 *
 * Dos tipos de pista:
 *  - El MONTO: saldo exacto (liquidación), anticipo del 50%, pago total, varias cotizaciones del mismo cliente.
 *  - El TEXTO del depósito: folio, nombre del cliente o palabras del proyecto ("Tarjetas NFC Acme").
 * Un monto "normal" (saldo, 50%, total) puede sugerirse solo. Las coincidencias raras (sin IVA, otros porcentajes)
 * y los abonos libres necesitan además una pista de texto: sin ella, cualquier cifra redonda coincidiría por casualidad.
 */

const money = (n: number) => Math.round(n * 100) / 100;
const near = (a: number, b: number) => Math.abs(a - b) <= SUGGEST_AMOUNT_TOLERANCE;
const round1 = (n: number) => Math.round(n * 10) / 10;
const peso = (n: number) => `$${money(n).toLocaleString("es-MX")}`;

const tokens = (s: string) => new Set(normalizeText(s).split(" ").filter((t) => t.length >= RECON_MIN_TOKEN_LENGTH && !/^\d{1,4}$/.test(t)));

/** Cuántas palabras de `source` aparecen en el texto del depósito. */
function hits(description: string, source: string): number {
  const text = tokens(description);
  let n = 0;
  for (const t of tokens(source)) if (text.has(t)) n++;
  return n;
}

/** El folio ("LI-2026-0043") aparece en el texto del depósito, con o sin guiones. */
function folioInText(description: string, q: OpenQuote): boolean {
  const compact = (s: string) => normalizeText(s).replace(/ /g, "");
  const f = compact(q.folio);
  return f.length >= 6 && compact(description).includes(f);
}

type Evidence = { folio: boolean; client: number; project: number };
const evidenceOf = (description: string, q: OpenQuote): Evidence => ({ folio: folioInText(description, q), client: hits(description, q.clientName), project: hits(description, q.project) });

type Base = { amount: number; kind: Suggestion["kind"]; label: string; score: number; reason: string; need: "none" | "any" | "specific" };

/** Montos con los que una cotización podría recibir este depósito. `need`: qué pista de texto exige. */
function amountsFor(q: OpenQuote, amount: number): Base[] {
  const out: Base[] = [];
  const untouched = q.collected <= SUGGEST_AMOUNT_TOLERANCE;
  if (near(amount, q.owed)) {
    out.push(
      untouched
        ? { amount, kind: "full", label: SUGGEST_KIND_LABELS.full, score: SUGGEST_SCORES.full, reason: "Es el total de la cotización", need: "none" }
        : { amount, kind: "settle", label: SUGGEST_KIND_LABELS.settle, score: SUGGEST_SCORES.settle, reason: `Es justo el saldo pendiente (ya se habían cobrado ${peso(q.collected)})`, need: "none" },
    );
  }
  if (untouched) {
    if (near(amount, q.total * (SUGGEST_MAIN_ADVANCE_PERCENT / 100))) {
      out.push({ amount, kind: "advance", label: `Anticipo del ${SUGGEST_MAIN_ADVANCE_PERCENT}%`, score: SUGGEST_SCORES.advanceMain, reason: `Es el ${SUGGEST_MAIN_ADVANCE_PERCENT}% del total`, need: "none" });
    } else {
      for (const p of SUGGEST_OTHER_ADVANCE_PERCENTS) {
        if (near(amount, q.total * (p / 100))) out.push({ amount, kind: "advance", label: `Anticipo del ${p}%`, score: SUGGEST_SCORES.advanceOther, reason: `Es el ${p}% del total`, need: "any" });
      }
    }
    if (q.subtotal > 0 && q.subtotal < q.total - 0.5) {
      if (near(amount, q.subtotal)) out.push({ amount, kind: "full", label: `${SUGGEST_KIND_LABELS.full} sin IVA`, score: SUGGEST_SCORES.noTax, reason: "Coincide con el subtotal, sin IVA", need: "any" });
      else if (near(amount, q.subtotal * (SUGGEST_MAIN_ADVANCE_PERCENT / 100))) out.push({ amount, kind: "advance", label: `Anticipo del ${SUGGEST_MAIN_ADVANCE_PERCENT}% sin IVA`, score: SUGGEST_SCORES.noTax, reason: `Es el ${SUGGEST_MAIN_ADVANCE_PERCENT}% del subtotal, sin IVA`, need: "any" });
    }
  }
  // Abono libre: menos que el saldo y sin ser ninguno de los montos anteriores.
  if (out.length === 0 && amount < q.owed - SUGGEST_AMOUNT_TOLERANCE) {
    out.push({ amount, kind: "partial", label: SUGGEST_KIND_LABELS.partial, score: SUGGEST_SCORES.partial, reason: `Abono de ${peso(amount)} de un saldo de ${peso(q.owed)}`, need: "specific" });
  }
  return out;
}

function allocation(q: OpenQuote, amount: number): Allocation {
  return {
    quoteId: q.id,
    folio: q.folio,
    project: q.project,
    clientName: q.clientName,
    amount: money(amount),
    percentOfTotal: q.total > 0 ? round1(((q.collected + amount) / q.total) * 100) : 0,
    after: q.collected + amount >= q.total - 0.01 ? "paid" : "advance",
  };
}

export function suggestQuotes(line: BankLine, quotes: OpenQuote[]): Suggestion[] {
  if (line.amount <= 0) return [];
  const amount = line.amount;
  const found: Suggestion[] = [];

  // ── Una cotización ──────────────────────────────────────────────────────
  for (const q of quotes) {
    if (q.owed <= SUGGEST_AMOUNT_TOLERANCE) continue;
    const ev = evidenceOf(line.description, q);
    for (const base of amountsFor(q, amount)) {
      const anyClue = ev.folio || ev.client > 0 || ev.project > 0;
      if (base.need === "any" && !anyClue) continue;
      if (base.need === "specific" && !(ev.folio || ev.project > 0)) continue;

      let score = base.score;
      const reasons = [base.reason];
      if (ev.folio) {
        score += SUGGEST_SCORES.folioInText;
        reasons.push("El folio aparece en el depósito");
      }
      if (ev.client >= 2) {
        score += SUGGEST_SCORES.clientTwoTokens;
        reasons.push("El nombre del cliente aparece en el depósito");
      } else if (ev.client === 1) {
        score += SUGGEST_SCORES.clientOneToken;
        reasons.push("Parte del nombre del cliente aparece en el depósito");
      }
      if (ev.project >= 2) {
        score += SUGGEST_SCORES.projectTwoTokens;
        reasons.push("El proyecto aparece en el depósito");
      } else if (ev.project === 1) {
        score += SUGGEST_SCORES.projectOneToken;
        reasons.push("Parte del nombre del proyecto aparece en el depósito");
      }
      if (SUGGEST_APPROVED_STATUSES.includes(q.status)) score += SUGGEST_SCORES.approved;
      found.push({ kind: base.kind, label: base.label, score, allocations: [allocation(q, base.amount)], reasons });
    }
  }

  // ── Varias cotizaciones del mismo cliente (cada una aporta su saldo o su anticipo) ─
  const byClient = new Map<string, OpenQuote[]>();
  for (const q of quotes) {
    if (q.owed <= SUGGEST_AMOUNT_TOLERANCE || !q.clientId) continue;
    // Solo clientes mencionados en el depósito: sin esa pista habría demasiadas combinaciones al azar.
    if (hits(line.description, q.clientName) === 0) continue;
    byClient.set(q.clientId, [...(byClient.get(q.clientId) ?? []), q]);
  }
  for (const group of byClient.values()) {
    const options = group.slice(0, SUGGEST_MAX_QUOTES_PER_CLIENT).map((q) => ({
      q,
      parts: [q.owed, ...(q.collected <= SUGGEST_AMOUNT_TOLERANCE ? [q.total * (SUGGEST_MAIN_ADVANCE_PERCENT / 100)] : [])].filter((v, i, a) => a.indexOf(v) === i),
    }));
    const walk = (start: number, chosen: { q: OpenQuote; value: number }[], sum: number) => {
      if (chosen.length >= 2 && near(sum, amount)) {
        found.push({
          kind: "multi",
          label: `${SUGGEST_KIND_LABELS.multi} (${chosen.length})`,
          score: SUGGEST_SCORES.multi + SUGGEST_SCORES.clientOneToken - (chosen.length - 2) * SUGGEST_SCORES.multiExtraPenalty,
          allocations: chosen.map((c) => allocation(c.q, c.value)),
          reasons: [`Suman exactamente el depósito: ${chosen.map((c) => c.q.folio).join(" + ")}`, "Todas son del mismo cliente mencionado en el depósito"],
        });
        return;
      }
      if (chosen.length >= SUGGEST_MAX_COMBO) return;
      for (let i = start; i < options.length; i++) {
        for (const value of options[i].parts) {
          if (sum + value > amount + SUGGEST_AMOUNT_TOLERANCE) continue;
          walk(i + 1, [...chosen, { q: options[i].q, value }], sum + value);
        }
      }
    };
    walk(0, [], 0);
  }

  const key = (s: Suggestion) => s.allocations.map((a) => `${a.quoteId}:${a.amount}`).join("|");
  return found
    .filter((s) => s.score >= SUGGEST_MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .filter((s, i, arr) => arr.findIndex((x) => key(x) === key(s)) === i)
    .slice(0, SUGGEST_MAX_PER_LINE);
}
