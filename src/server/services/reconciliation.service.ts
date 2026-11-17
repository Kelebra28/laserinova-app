import { prisma } from "@/lib/prisma";
import { reconcile } from "@/lib/bank-reconciliation";
import { lineFingerprints, fingerprintNote, readFingerprint } from "@/lib/bank-fingerprint";
import { suggestQuotes } from "@/lib/bank-quote-suggestions";
import { updateQuotePaymentService, type DbClient } from "./quote.service";
import { DASHBOARD_TZ, DAY_MS, EXPENSE_TYPES, INCOME_TYPES } from "@/constants/dashboard.constants";
import {
  BANK_FINGERPRINT_PREFIX,
  BANK_PAYMENT_METHOD,
  RECON_CASH_METHODS,
  RECON_SYSTEM_BUFFER_DAYS,
  SUGGEST_AMOUNT_TOLERANCE,
  SUGGEST_OPEN_QUOTES_LIMIT,
  SUGGEST_QUOTE_STATUSES,
} from "@/constants/reconciliation.constants";
import type { BankLine, OpenQuote, ReconResult, SystemMovement } from "@/types/reconciliation";

/**
 * Conciliación bancaria.
 * - reconcileStatementService: solo lectura. Compara el estado de cuenta contra los movimientos y propone
 *   a qué cotización pertenece cada depósito que no está registrado.
 * - registerBankPaymentService: escribe, y solo cuando la persona confirma una sugerencia. Todo en una transacción.
 */

const ymdFmt = new Intl.DateTimeFormat("en-CA", { timeZone: DASHBOARD_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const ymd = (d: Date) => ymdFmt.format(d);
const startOf = (s: string) => new Date(`${s}T00:00:00-06:00`);
const noon = (s: string) => new Date(`${s}T12:00:00-06:00`);

/** Cotizaciones que todavía pueden recibir cobros, con su saldo. */
async function loadOpenQuotes(db: DbClient): Promise<OpenQuote[]> {
  const rows = await db.quote.findMany({
    where: { active: true, status: { in: SUGGEST_QUOTE_STATUSES } },
    select: {
      id: true,
      folio: true,
      project: true,
      clientId: true,
      status: true,
      total: true,
      subtotal: true,
      realAmountCollected: true,
      prospectName: true,
      client: { select: { name: true, company: true } },
      contact: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: SUGGEST_OPEN_QUOTES_LIMIT,
  });
  return rows
    .map((q) => {
      const collected = q.realAmountCollected || 0;
      const names = [q.client?.company, q.client?.name, q.prospectName, q.contact?.name].filter((n): n is string => !!n);
      return {
        id: q.id,
        folio: q.folio,
        project: q.project,
        clientId: q.clientId,
        clientName: [...new Set(names)].join(" · ") || "Sin cliente",
        status: q.status,
        total: q.total,
        subtotal: q.subtotal,
        collected,
        owed: Math.max(q.total - collected, 0),
      };
    })
    .filter((q) => q.owed > SUGGEST_AMOUNT_TOLERANCE);
}

export async function reconcileStatementService(lines: BankLine[], db: DbClient = prisma, period?: { from: string; to: string }): Promise<ReconResult> {
  const dates = [...lines.map((l) => l.date), ...(period ? [period.from, period.to] : [])].sort();
  const from = dates[0];
  const to = dates[dates.length - 1];
  const buffer = RECON_SYSTEM_BUFFER_DAYS * DAY_MS;
  const fingerprints = lineFingerprints(lines);

  const [rows, openQuotes] = await Promise.all([
    db.financialTransaction.findMany({
      where: {
        isDeleted: false,
        type: { in: [...INCOME_TYPES, ...EXPENSE_TYPES] },
        date: { gte: new Date(startOf(from).getTime() - buffer), lte: new Date(startOf(to).getTime() + DAY_MS + buffer) },
      },
      select: {
        id: true,
        type: true,
        category: true,
        amount: true,
        description: true,
        notes: true,
        date: true,
        paymentMethod: true,
        provider: true,
        client: { select: { name: true } },
        quote: { select: { folio: true } },
      },
      orderBy: { date: "asc" },
    }),
    loadOpenQuotes(db),
  ]);

  const system: SystemMovement[] = rows.map((r) => {
    const income = INCOME_TYPES.includes(r.type);
    const method = r.paymentMethod ? r.paymentMethod.toLowerCase() : null;
    return {
      id: r.id,
      date: ymd(r.date),
      amount: income ? r.amount : -r.amount,
      description: [r.category, r.description].filter(Boolean).join(" · "),
      detail: [r.category, r.description, r.provider, r.client?.name, r.quote?.folio].filter(Boolean).join(" "),
      method,
      isCash: method !== null && RECON_CASH_METHODS.includes(method),
    };
  });

  // Renglones que ya se concilieron antes: el movimiento creado trae la marca del renglón en sus notas.
  const byMark = new Map<string, string[]>();
  for (const r of rows) {
    const mark = readFingerprint(r.notes);
    if (mark) byMark.set(mark, [...(byMark.get(mark) ?? []), r.id]);
  }
  const preMatched: Record<string, string[]> = {};
  for (const l of lines) {
    const ids = byMark.get(fingerprints.get(l.id) ?? "");
    if (ids) preMatched[l.id] = ids;
  }

  const core = reconcile(lines, system, { preMatched, period });
  const suggestions: ReconResult["suggestions"] = {};
  for (const b of core.bankOnly) {
    if (b.amount <= 0) continue;
    const found = suggestQuotes(b, openQuotes);
    if (found.length) suggestions[b.id] = found;
  }
  return { ...core, suggestions, openQuotes, fingerprints: Object.fromEntries(fingerprints) };
}

/* ───────────────────────── Registrar un cobro (escribe) ───────────────────────── */

export type RegisterInput = {
  line: BankLine;
  fingerprint: string;
  allocations: { quoteId: string; amount: number }[];
  userId: string;
  /** Si el depósito viene de un estado guardado: su movimiento, para marcarlo como cobrado. */
  movementId?: string;
};

export type RegisteredPayment = { quoteId: string; folio: string; amount: number; collected: number; total: number; paid: boolean };

const cents = (n: number) => Math.round(n * 100);

/**
 * Registra un depósito del banco como cobro de una o varias cotizaciones.
 * Todo o nada (una transacción). Se rechaza si el depósito ya se registró, si el monto no coincide con lo
 * repartido, si excede el saldo de una cotización o si los cobros anteriores de la cotización no cuadran con
 * sus movimientos (en ese caso el sistema "corregiría" movimientos viejos y no se debe tocar).
 */
async function registerWithClient(tx: DbClient, input: RegisterInput): Promise<RegisteredPayment[]> {
  const { line, fingerprint, allocations, userId, movementId } = input;
  const mark = fingerprintNote(fingerprint);

  if (line.amount <= 0) throw new Error("Solo se pueden registrar depósitos (abonos).");
  if (allocations.length === 0) throw new Error("Elige al menos una cotización.");
  if (new Set(allocations.map((a) => a.quoteId)).size !== allocations.length) throw new Error("Una cotización no puede repetirse en el mismo depósito.");
  if (allocations.some((a) => !(a.amount > 0))) throw new Error("Cada monto debe ser mayor a cero.");
  if (Math.abs(cents(allocations.reduce((s, a) => s + a.amount, 0)) - cents(line.amount)) > 1) throw new Error("Lo repartido entre las cotizaciones debe sumar exactamente el depósito.");

  const already = await tx.financialTransaction.findFirst({ where: { isDeleted: false, notes: { contains: `${BANK_FINGERPRINT_PREFIX}${fingerprint}` } }, select: { id: true } });
  if (already) throw new Error("Este depósito ya está registrado en el sistema.");

  const done: RegisteredPayment[] = [];
  for (const a of allocations) {
    const q = await tx.quote.findUnique({
      where: { id: a.quoteId },
      select: { id: true, folio: true, active: true, status: true, total: true, tax: true, taxable: true, realAmountCollected: true, clientId: true },
    });
    if (!q || !q.active) throw new Error("Una de las cotizaciones ya no existe o está inactiva.");
    if (!SUGGEST_QUOTE_STATUSES.includes(q.status)) throw new Error(`${q.folio} no está en un estado que reciba cobros.`);

    const collected = q.realAmountCollected || 0;
    const owed = q.total - collected;
    if (a.amount > owed + SUGGEST_AMOUNT_TOLERANCE) throw new Error(`${q.folio}: el monto excede su saldo pendiente.`);

    // Los cobros anteriores deben coincidir con sus movimientos; si no, registrar uno nuevo haría que el sistema reescriba los viejos.
    const prev = await tx.financialTransaction.aggregate({ where: { quoteId: q.id, isDeleted: false, type: { in: INCOME_TYPES } }, _sum: { amount: true } });
    if (Math.abs((prev._sum.amount || 0) - collected) > SUGGEST_AMOUNT_TOLERANCE) {
      throw new Error(`${q.folio}: sus cobros anteriores no cuadran con sus movimientos. Corrígelo primero en Cobranza.`);
    }

    const newCollected = collected + a.amount;
    const paid = newCollected >= q.total - 0.01;
    const type = paid ? (collected > 0 ? "LIQUIDACION" : "INGRESO") : "ANTICIPO";
    const category = paid ? (collected > 0 ? "Liquidación de Proyecto" : "Pago Completo") : "Anticipo de Proyecto";

    await tx.financialTransaction.create({
      data: {
        type,
        category,
        amount: a.amount,
        taxAmount: q.taxable && q.total > 0 ? a.amount * (q.tax / q.total) : 0,
        description: `${category} - ${q.folio} (conciliación bancaria)`,
        notes: `${mark} Depósito del banco: ${line.description || "sin descripción"}`,
        date: noon(line.date),
        paymentMethod: BANK_PAYMENT_METHOD,
        quoteId: q.id,
        clientId: q.clientId,
        createdById: userId,
        status: "ACTIVO",
      },
    });
    // El movimiento ya existe, así que el sincronizador no crea otro: solo actualiza la cotización.
    await updateQuotePaymentService(q.id, newCollected, paid ? "PAID" : "PARTIAL", tx);
    done.push({ quoteId: q.id, folio: q.folio, amount: a.amount, collected: newCollected, total: q.total, paid });
  }
  if (movementId) await tx.bankMovement.updateMany({ where: { id: movementId, state: "PENDIENTE" }, data: { state: "COBRO" } });
  return done;
}

/** Registra el cobro como una sola operación: si algo falla, no se guarda nada. */
export async function registerBankPaymentService(input: RegisterInput): Promise<RegisteredPayment[]> {
  return prisma.$transaction((tx) => registerWithClient(tx, input), { timeout: 20_000 });
}

/** Solo para pruebas: la misma lógica sobre un cliente de transacción que el llamador puede deshacer. */
export const registerBankPaymentWithClient = registerWithClient;
