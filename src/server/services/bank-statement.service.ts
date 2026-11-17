import { prisma } from "@/lib/prisma";
import { lineFingerprints, fingerprintNote } from "@/lib/bank-fingerprint";
import { categorizeCharge, merchantOf } from "@/lib/bank-categories";
import { BANK_FINGERPRINT_PREFIX, BANK_PAYMENT_METHOD } from "@/constants/reconciliation.constants";
import { CHARGE_EXPENSE_CATEGORY, type MovementState } from "@/constants/bank-storage.constants";
import type { DbClient } from "./quote.service";
import type { ParsedStatement, StatementCheck } from "@/types/bank-statement";
import type { LoadedStatement } from "@/types/bank-overview";

const day = (s: string) => new Date(`${s}T00:00:00.000Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const noon = (s: string) => new Date(`${s}T12:00:00-06:00`);

export type SaveResult = { id: string; status: "saved" | "exists"; movements: number };

/**
 * Guarda un estado ya leído (datos, nunca el PDF). Una cuenta + un periodo existen una sola vez:
 * si se vuelve a subir, no se duplica nada y se conserva lo que ya se hizo con sus movimientos.
 */
export async function saveStatementService(statement: ParsedStatement, fileName: string | null, userId: string, db: DbClient = prisma): Promise<SaveResult> {
  if (!statement.period || !statement.accountId) throw new Error("El estado no trae cuenta o periodo; no se puede guardar.");
  const from = day(statement.period.from);
  const to = day(statement.period.to);

  const existing = await db.bankStatement.findUnique({ where: { accountId_periodFrom_periodTo: { accountId: statement.accountId, periodFrom: from, periodTo: to } }, select: { id: true, _count: { select: { movements: true } } } });
  if (existing) return { id: existing.id, status: "exists", movements: existing._count.movements };

  const marks = lineFingerprints(statement.lines);
  const created = await db.bankStatement.create({
    data: {
      bank: statement.bank,
      product: statement.product,
      accountId: statement.accountId,
      accountLast4: statement.accountLast4 ?? statement.accountId.slice(-4),
      holder: statement.holder,
      periodFrom: from,
      periodTo: to,
      openingBalance: statement.openingBalance,
      closingBalance: statement.closingBalance,
      checks: statement.checks,
      warnings: statement.warnings,
      fileName,
      uploadedById: userId,
      movements: {
        create: statement.lines.map((l) => ({ fingerprint: marks.get(l.id)!, date: day(l.date), description: l.description, amount: l.amount, balance: l.balance })),
      },
    },
    select: { id: true },
  });
  return { id: created.id, status: "saved", movements: statement.lines.length };
}

/** Los estados guardados, con la misma forma que un estado recién leído (los renglones llevan su id y su estado). */
export async function listStatementsService(db: DbClient = prisma, onlyId?: string): Promise<LoadedStatement[]> {
  const rows = await db.bankStatement.findMany({ where: onlyId ? { id: onlyId } : undefined, orderBy: [{ accountId: "asc" }, { periodFrom: "asc" }], include: { movements: { orderBy: [{ date: "asc" }, { fingerprint: "asc" }] } } });
  return rows.map((r) => ({
    storedId: r.id,
    fileName: r.fileName ?? `${r.accountLast4} ${iso(r.periodFrom)}`,
    bank: r.bank,
    product: r.product,
    accountLast4: r.accountLast4,
    accountId: r.accountId,
    holder: r.holder,
    openingBalance: r.openingBalance,
    closingBalance: r.closingBalance,
    period: { from: iso(r.periodFrom), to: iso(r.periodTo) },
    checks: r.checks as StatementCheck[],
    warnings: r.warnings as string[],
    lines: r.movements.map((m) => ({ id: m.id, date: iso(m.date), description: m.description, amount: m.amount, balance: m.balance, state: m.state as MovementState })),
  }));
}

/** Quita un estado guardado y sus movimientos. Los gastos que ya se registraron en Finanzas se conservan. */
export async function deleteStatementService(id: string, db: DbClient = prisma): Promise<void> {
  await db.bankStatement.delete({ where: { id } });
}

export type RegisterExpensesResult = { created: number; skipped: number; total: number };

/**
 * Convierte cargos del banco en gastos de Finanzas. Solo cargos pendientes; si el renglón ya se registró
 * (por su marca en las notas) no se vuelve a crear. Todo o nada.
 */
export async function registerExpensesService(movementIds: string[], userId: string, db: DbClient = prisma): Promise<RegisterExpensesResult> {
  const ids = [...new Set(movementIds)];
  const movements = await db.bankMovement.findMany({ where: { id: { in: ids } } });
  let created = 0;
  let skipped = 0;
  let total = 0;
  for (const m of movements) {
    if (m.amount >= 0 || m.state !== "PENDIENTE") {
      skipped++;
      continue;
    }
    const mark = fingerprintNote(`${m.statementId.slice(0, 8)}:${m.fingerprint}`);
    const dup = await db.financialTransaction.findFirst({ where: { isDeleted: false, notes: { contains: `${BANK_FINGERPRINT_PREFIX}${m.statementId.slice(0, 8)}:${m.fingerprint}` } }, select: { id: true } });
    if (dup) {
      await db.bankMovement.update({ where: { id: m.id }, data: { state: "GASTO", transactionId: dup.id } });
      skipped++;
      continue;
    }
    const cat = categorizeCharge(m.description);
    const amount = Math.abs(m.amount);
    const tx = await db.financialTransaction.create({
      data: {
        type: "GASTO_OPERATIVO",
        category: CHARGE_EXPENSE_CATEGORY[cat.key] ?? "Otros",
        amount,
        taxAmount: 0,
        description: `${merchantOf(m.description)} (estado de cuenta)`.slice(0, 190),
        notes: `${mark} ${m.description}`.slice(0, 2000),
        date: noon(iso(m.date)),
        paymentMethod: BANK_PAYMENT_METHOD,
        provider: merchantOf(m.description).slice(0, 190),
        createdById: userId,
        status: "ACTIVO",
      },
      select: { id: true },
    });
    await db.bankMovement.update({ where: { id: m.id }, data: { state: "GASTO", transactionId: tx.id } });
    created++;
    total += amount;
  }
  return { created, skipped: skipped + (ids.length - movements.length), total: Math.round(total * 100) / 100 };
}

/** Marca (o desmarca) movimientos como "no es del negocio". No toca Finanzas. */
export async function setIgnoredService(movementIds: string[], ignored: boolean, db: DbClient = prisma): Promise<number> {
  const res = await db.bankMovement.updateMany({
    where: { id: { in: movementIds }, state: ignored ? "PENDIENTE" : "IGNORADO" },
    data: { state: ignored ? "IGNORADO" : "PENDIENTE" },
  });
  return res.count;
}


