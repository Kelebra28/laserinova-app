import { prisma } from "@/lib/prisma";
import { EXPENSE_TYPES, INCOME_TYPES } from "@/constants/dashboard.constants";
import { FINANCE_COLLECTION_STATUSES, FINANCE_EXCLUDED_STATUSES, FINANCE_FORM_QUOTES_LIMIT, FINANCE_PAID_TOLERANCE } from "@/constants/finance.constants";
import type { FinanceMovement } from "@/types/finance";

/**
 * Finanzas del mes.
 * Ingresos = movimientos de ingreso (FinancialTransaction) + la parte de los cobros de cotizaciones que
 * todavía NO tiene movimiento. Cada cobro registrado en una cotización ya genera su propio movimiento
 * (ver syncQuoteIncomeTransactions), así que sumar los dos contaba el dinero doble.
 * El costo estimado de producción de las cotizaciones NO cuenta como gasto, solo los GASTO_PROYECTO manuales.
 */

/** Cobro de una cotización que aún no está reflejado en ningún movimiento (dinero + IVA pendientes de contar). */
type UncoveredCollection = { quote: { id: string; folio: string; project: string; closeDate: Date | null; updatedAt: Date; taxable: boolean; total: number; tax: number }; amount: number; tax: number };

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function monthRange(year: number, month: number) {
  return { start: new Date(year, month, 1), end: new Date(year, month + 1, 0, 23, 59, 59) };
}

/** IVA de las cotizaciones cobradas que sus movimientos ligados no registran. */
async function quoteTaxNotInTransactions(
  paidQuotes: { id: string; taxable: boolean; total: number; tax: number; realAmountCollected: number | null }[],
  linkedByQuote: Map<string | null, { amount: number; tax: number }>,
) {
  return paidQuotes.reduce((s, q) => {
    if (!q.taxable || q.total <= 0) return s;
    const quoteTax = q.tax * ((q.realAmountCollected || 0) / q.total);
    const already = linkedByQuote.get(q.id)?.tax || 0;
    return s + Math.max(quoteTax - already, 0);
  }, 0);
}

/** Totales de un mes (se usa para el mes elegido y para el anterior). */
async function monthTotals(start: Date, end: Date) {
  const transactions = await prisma.financialTransaction.findMany({
    where: { isDeleted: false, date: { gte: start, lte: end } },
    include: {
      quote: { select: { folio: true, project: true } },
      client: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  // Solo cotizaciones que YA tienen un cobro real (adelanto o liquidación).
  const paidQuotes = await prisma.quote.findMany({
    where: {
      active: true,
      closeDate: { gte: start, lte: end },
      realAmountCollected: { gt: 0 },
      paymentStatus: { in: ["PARTIAL", "PAID"] },
    },
  });

  // Lo ya registrado como movimiento para esas cotizaciones (en cualquier fecha).
  const linked = paidQuotes.length
    ? await prisma.financialTransaction.groupBy({
        by: ["quoteId"],
        where: { isDeleted: false, type: { in: INCOME_TYPES }, quoteId: { in: paidQuotes.map((q) => q.id) } },
        _sum: { amount: true, taxAmount: true },
      })
    : [];
  const linkedByQuote = new Map(linked.map((r) => [r.quoteId, { amount: r._sum.amount || 0, tax: r._sum.taxAmount || 0 }]));

  const uncovered: UncoveredCollection[] = [];
  for (const q of paidQuotes) {
    const collected = q.realAmountCollected || 0;
    const already = linkedByQuote.get(q.id) || { amount: 0, tax: 0 };
    const amount = Math.max(collected - already.amount, 0);
    if (amount <= 0.01) continue;
    const proportion = q.total > 0 ? collected / q.total : 0;
    const quoteTax = q.taxable ? q.tax * proportion : 0;
    uncovered.push({ quote: q, amount, tax: Math.max(quoteTax - already.tax, 0) });
  }
  const quoteIncome = uncovered.reduce((s, u) => s + u.amount, 0);

  const txIncome = transactions.filter((t) => INCOME_TYPES.includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const opExpenses = transactions.filter((t) => t.type === "GASTO_OPERATIVO").reduce((s, t) => s + t.amount, 0);
  const projectCosts = transactions.filter((t) => t.type === "GASTO_PROYECTO").reduce((s, t) => s + t.amount, 0);
  const txTax = transactions.filter((t) => INCOME_TYPES.includes(t.type)).reduce((s, t) => s + (t.taxAmount || 0), 0);

  // IVA: el de los movimientos + el de cotizaciones cobradas cuyo movimiento no lo trae (los cobros automáticos van sin IVA).
  const quoteTax = await quoteTaxNotInTransactions(paidQuotes, linkedByQuote);
  const income = quoteIncome + txIncome;
  const taxCollected = quoteTax + txTax;
  const grossProfit = income - projectCosts;
  const netProfit = grossProfit - opExpenses;
  return { transactions, uncovered, paidQuotes, income, opExpenses, projectCosts, taxCollected, grossProfit, netProfit };
}

export async function getFinanceOverviewService(year: number, month: number) {
  const { start, end } = monthRange(year, month);
  const prevRange = monthRange(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);

  const [cur, prev] = await Promise.all([monthTotals(start, end), monthTotals(prevRange.start, prevRange.end)]);

  // Cobranza: solo lo que el cliente ya aceptó, o cualquier cotización que ya tenga dinero cobrado.
  const collectionQuotes = await prisma.quote.findMany({
    where: {
      active: true,
      OR: [
        { status: { in: FINANCE_COLLECTION_STATUSES } },
        { status: { notIn: FINANCE_EXCLUDED_STATUSES }, realAmountCollected: { gt: 0 } },
      ],
    },
    include: { client: true },
  });
  const fullyPaidQuotes = collectionQuotes.filter((q) => q.total - (q.realAmountCollected || 0) <= FINANCE_PAID_TOLERANCE && (q.realAmountCollected || 0) > 0);

  // Para los formularios.
  const quotes = await prisma.quote.findMany({
    where: { active: true, status: { notIn: ["CANCELLED", "REJECTED"] } },
    select: { id: true, folio: true, project: true },
    orderBy: { createdAt: "desc" },
    take: FINANCE_FORM_QUOTES_LIMIT,
  });
  const clients = await prisma.client.findMany({
    where: { active: true },
    select: { id: true, name: true, company: true },
    orderBy: { name: "asc" },
  });

  // Movimientos del mes: transacciones reales + cobros de cotizaciones (virtuales).
  // Solo cobros que no tienen movimiento propio; los demás ya aparecen como movimiento real.
  const virtual: FinanceMovement[] = cur.uncovered.map(({ quote: q, amount, tax }) => ({
    id: `virtual-${q.id}`,
    type: "INGRESO",
    category: "Cobro de Proyecto",
    amount,
    taxAmount: tax,
    description: `Pago registrado: ${q.project}`,
    date: q.closeDate || q.updatedAt,
    status: "ACTIVO",
    isVirtual: true,
    quote: { folio: q.folio, project: q.project },
    client: null,
  }));
  const movements = ([...cur.transactions, ...virtual] as FinanceMovement[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Flujo por día del mes (ingresos y gastos) y gastos por categoría.
  const daysInMonth = end.getDate();
  const daily = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, income: 0, expense: 0 }));
  const byCategory = new Map<string, number>();
  for (const m of movements) {
    const d = new Date(m.date).getDate() - 1;
    if (!daily[d]) continue;
    if (INCOME_TYPES.includes(m.type)) daily[d].income += m.amount;
    else if (EXPENSE_TYPES.includes(m.type)) {
      daily[d].expense += m.amount;
      byCategory.set(m.category, (byCategory.get(m.category) || 0) + m.amount);
    }
  }
  const totalExpenses = cur.opExpenses + cur.projectCosts;
  const prevExpenses = prev.opExpenses + prev.projectCosts;
  const breakdown = [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount, share: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);

  return {
    year,
    month,
    monthLabel: start.toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
    kpis: {
      income: cur.income,
      opExpenses: cur.opExpenses,
      projectCosts: cur.projectCosts,
      totalExpenses,
      taxCollected: cur.taxCollected,
      grossProfit: cur.grossProfit,
      netProfit: cur.netProfit,
      grossMargin: cur.income > 0 ? (cur.grossProfit / cur.income) * 100 : null,
    },
    changes: {
      income: pctChange(cur.income, prev.income),
      expenses: pctChange(totalExpenses, prevExpenses),
      netProfit: pctChange(cur.netProfit, prev.netProfit),
    },
    spark: {
      income: daily.map((d) => d.income),
      expense: daily.map((d) => d.expense),
      net: daily.map((d) => d.income - d.expense),
    },
    daily,
    breakdown,
    activeProjects: collectionQuotes.length,
    collectionQuotes,
    fullyPaidQuotes,
    quotes,
    clients,
    movements,
  };
}

export type FinanceOverview = Awaited<ReturnType<typeof getFinanceOverviewService>>;
