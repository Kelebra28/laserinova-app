import { prisma } from "@/lib/prisma";
import { formatDueDate, todayYMD } from "@/lib/dates";
import { PIPELINE_COLORS } from "@/constants/dashboard.constants";

const INCOME_TYPES = ["INGRESO", "ANTICIPO", "LIQUIDACION"];
const EXPENSE_TYPES = ["GASTO_OPERATIVO", "GASTO_PROYECTO"];
const DEAD_STATUSES = ["CANCELLED", "REJECTED"];
// Solo se debe lo que el cliente ya aprobó; una cotización enviada o calculada aún no es deuda.
const OWED_STATUSES = ["APPROVED", "ACCEPTED", "IN_PRODUCTION", "DELIVERED", "DONE"];
const DAY = 24 * 60 * 60 * 1000;

function monthRange(offsetFromCurrent: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetFromCurrent, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetFromCurrent + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/** Variación porcentual real; null cuando no hay base de comparación. */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

async function sumTransactions(types: string[], start: Date, end: Date) {
  const r = await prisma.financialTransaction.aggregate({
    where: { isDeleted: false, type: { in: types }, date: { gte: start, lte: end } },
    _sum: { amount: true, taxAmount: true },
  });
  return { amount: r._sum.amount || 0, tax: r._sum.taxAmount || 0 };
}

export async function getDashboardStatsService() {
  const now = new Date();
  const thisMonth = monthRange(0);
  const prevMonth = monthRange(-1);

  // ── KPIs del mes (todo desde movimientos financieros reales) ──────────────
  const [income, prevIncome, expense, prevExpense] = await Promise.all([
    sumTransactions(INCOME_TYPES, thisMonth.start, thisMonth.end),
    sumTransactions(INCOME_TYPES, prevMonth.start, prevMonth.end),
    sumTransactions(EXPENSE_TYPES, thisMonth.start, thisMonth.end),
    sumTransactions(EXPENSE_TYPES, prevMonth.start, prevMonth.end),
  ]);

  const profit = income.amount - expense.amount;
  const prevProfit = prevIncome.amount - prevExpense.amount;

  // ── Cuentas por cobrar (global) ───────────────────────────────────────────
  const pendingQuotes = await prisma.quote.findMany({
    where: {
      active: true,
      paymentStatus: { in: ["PENDING", "PARTIAL"] },
      status: { in: OWED_STATUSES },
    },
    select: { total: true, realAmountCollected: true },
  });
  const receivable = pendingQuotes.reduce((sum, q) => sum + Math.max(q.total - (q.realAmountCollected || 0), 0), 0);
  const receivableCount = pendingQuotes.filter((q) => q.total - (q.realAmountCollected || 0) > 0).length;

  // ── Gráfica: últimos 6 meses, ingresos vs gastos ──────────────────────────
  const months = await Promise.all(
    Array.from({ length: 6 }).map(async (_, i) => {
      const { start, end } = monthRange(i - 5);
      const [inc, exp] = await Promise.all([
        sumTransactions(INCOME_TYPES, start, end),
        sumTransactions(EXPENSE_TYPES, start, end),
      ]);
      return {
        month: start.toLocaleDateString("es-MX", { month: "short" }).replace(".", ""),
        year: start.getFullYear(),
        income: inc.amount,
        expense: exp.amount,
        profit: inc.amount - exp.amount,
      };
    })
  );

  // ── Embudo de cotizaciones abiertas (estado actual, no solo del mes) ──────
  const openQuotes = await prisma.quote.findMany({
    where: { active: true, status: { in: ["DRAFT", "SENT", "APPROVED", "IN_PRODUCTION"] } },
    select: { status: true, total: true },
  });
  const pipelineDef = [
    // counted: solo lo que el cliente ya aceptó suma dinero; borrador y enviadas se muestran como cantidad.
    { key: "DRAFT", label: "Borrador", color: PIPELINE_COLORS.DRAFT, counted: false },
    { key: "SENT", label: "Enviadas", color: PIPELINE_COLORS.SENT, counted: false },
    { key: "APPROVED", label: "Aprobadas", color: PIPELINE_COLORS.APPROVED, counted: true },
    { key: "IN_PRODUCTION", label: "En producción", color: PIPELINE_COLORS.IN_PRODUCTION, counted: true },
  ];
  const pipeline = pipelineDef.map((p) => {
    const rows = openQuotes.filter((q) => q.status === p.key);
    return { ...p, count: rows.length, amount: rows.reduce((s, q) => s + q.total, 0) };
  });

  // ── Cotizaciones creadas este mes: conversión ─────────────────────────────
  const monthQuotes = await prisma.quote.findMany({
    where: { active: true, createdAt: { gte: thisMonth.start, lte: thisMonth.end } },
    select: { id: true, status: true, total: true, clientId: true, prospectName: true, client: { select: { name: true, company: true } } },
  });
  const liveMonthQuotes = monthQuotes.filter((q) => !DEAD_STATUSES.includes(q.status));
  const closedStatuses = ["APPROVED", "IN_PRODUCTION", "DELIVERED"];
  const sentOrBeyond = monthQuotes.filter((q) => q.status !== "DRAFT");
  const closedCount = monthQuotes.filter((q) => closedStatuses.includes(q.status)).length;
  const conversionRate = sentOrBeyond.length > 0 ? (closedCount / sentOrBeyond.length) * 100 : null;

  // ── Mejores clientes del mes (por monto cotizado vigente) ─────────────────
  const byClient = new Map<string, { name: string; total: number; count: number }>();
  for (const q of liveMonthQuotes) {
    const key = q.clientId || `prospect:${q.prospectName || "sin-nombre"}`;
    const name = q.client?.company || q.client?.name || q.prospectName || "Sin cliente";
    const cur = byClient.get(key) || { name, total: 0, count: 0 };
    cur.total += q.total;
    cur.count += 1;
    byClient.set(key, cur);
  }
  const topClients = [...byClient.values()].sort((a, b) => b.total - a.total).slice(0, 5);

  // ── Atención requerida ────────────────────────────────────────────────────
  const staleCutoff = new Date(now.getTime() - 7 * DAY);
  // Lo rescatable va primero: cotizaciones con 7 a 60 días sin respuesta. Las de más de 60 días se cuentan aparte
  // (casi seguro están perdidas) para que no tapen lo que sí se puede cerrar.
  const dormantCutoff = new Date(now.getTime() - 60 * DAY);
  const todayStart = new Date(`${todayYMD("America/Mexico_City")}T00:00:00.000Z`);
  const [staleSent, deliveredUnpaid, overdueTasks, blockedTasks, staleTotal, dormantCount, unpaidTotal, overdueTotal, blockedTotal] = await Promise.all([
    prisma.quote.findMany({
      where: { active: true, status: "SENT", updatedAt: { lt: staleCutoff, gte: dormantCutoff } },
      select: { id: true, folio: true, project: true, total: true, updatedAt: true, client: { select: { name: true, company: true } }, prospectName: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.quote.findMany({
      where: { active: true, status: "DELIVERED", paymentStatus: { in: ["PENDING", "PARTIAL"] } },
      select: { id: true, folio: true, project: true, total: true, realAmountCollected: true, client: { select: { name: true, company: true } }, prospectName: true },
      orderBy: { updatedAt: "asc" },
      take: 5,
    }),
    prisma.task.findMany({
      where: { status: { not: "DONE" }, dueDate: { lt: todayStart } },
      select: { id: true, title: true, dueDate: true, status: true },
      orderBy: { dueDate: "desc" },
      take: 5,
    }),
    prisma.task.findMany({
      where: { status: "BLOCKED" },
      select: { id: true, title: true, blockerReason: true },
      take: 5,
    }),
    prisma.quote.count({ where: { active: true, status: "SENT", updatedAt: { lt: staleCutoff, gte: dormantCutoff } } }),
    prisma.quote.count({ where: { active: true, status: "SENT", updatedAt: { lt: dormantCutoff } } }),
    prisma.quote.count({ where: { active: true, status: "DELIVERED", paymentStatus: { in: ["PENDING", "PARTIAL"] } } }),
    prisma.task.count({ where: { status: { not: "DONE" }, dueDate: { lt: todayStart } } }),
    prisma.task.count({ where: { status: "BLOCKED" } }),
  ]);

  const clientLabel = (q: { client: { name: string | null; company: string | null } | null; prospectName: string | null }) =>
    q.client?.company || q.client?.name || q.prospectName || "Sin cliente";

  type AttentionItem = { id: string; href: string; title: string; detail: string };
  const attention: { key: string; label: string; tone: "amber" | "red" | "orange"; total: number; items: AttentionItem[] }[] = [
    {
      key: "stale",
      label: "Enviadas sin respuesta (7 a 60 días)",
      tone: "amber" as const,
      total: staleTotal,
      items: staleSent.map((q) => ({
        id: q.id,
        href: `/dashboard/quotes/${q.id}`,
        title: `${q.folio} · ${q.project}`,
        detail: `${clientLabel(q)} · hace ${Math.floor((now.getTime() - q.updatedAt.getTime()) / DAY)} días`,
      })),
    },
    {
      key: "unpaid",
      label: "Entregadas con saldo pendiente",
      tone: "red" as const,
      total: unpaidTotal,
      items: deliveredUnpaid.map((q) => ({
        id: q.id,
        href: `/dashboard/quotes/${q.id}`,
        title: `${q.folio} · ${q.project}`,
        detail: `${clientLabel(q)} · debe $${Math.max(q.total - (q.realAmountCollected || 0), 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`,
      })),
    },
    {
      key: "overdue",
      label: "Tareas vencidas",
      tone: "red" as const,
      total: overdueTotal,
      items: overdueTasks.map((t) => ({
        id: t.id,
        href: "/dashboard/tasks",
        title: t.title,
        detail: `Venció el ${formatDueDate(t.dueDate!.toISOString(), { day: "numeric", month: "short" })}`,
      })),
    },
    {
      key: "blocked",
      label: "Tareas bloqueadas",
      tone: "orange" as const,
      total: blockedTotal,
      items: blockedTasks.map((t) => ({
        id: t.id,
        href: "/dashboard/tasks",
        title: t.title,
        detail: t.blockerReason || "Sin motivo registrado",
      })),
    },
  ].filter((g) => g.items.length > 0);

  // ── Tareas activas (en curso, ordenadas por fecha límite) ─────────────────
  const activeTasksRaw = await prisma.task.findMany({
    where: { status: { in: ["IN_PROGRESS", "PENDING"] } },
    select: { id: true, title: true, status: true, priority: true, progress: true, dueDate: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    take: 30,
  });
  // IN_PROGRESS primero; dentro de cada grupo, con fecha límite más próxima arriba y sin fecha al final.
  const activeTasks = activeTasksRaw
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "IN_PROGRESS" ? -1 : 1;
      const ad = a.dueDate ? a.dueDate.getTime() : Infinity;
      const bd = b.dueDate ? b.dueDate.getTime() : Infinity;
      return ad - bd;
    })
    .slice(0, 6)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      progress: t.progress,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    }));
  const taskCounts = await prisma.task.groupBy({ by: ["status"], _count: { _all: true } });
  const tasksOpen = taskCounts.filter((t) => t.status !== "DONE" && t.status !== "BACKLOG").reduce((s, t) => s + t._count._all, 0);

  // ── Materiales más vendidos del mes ───────────────────────────────────────
  const concepts = await prisma.quoteConcept.findMany({
    where: { quoteId: { in: liveMonthQuotes.map((q) => q.id) }, materialId: { not: null } },
    select: { quantity: true, totalAmount: true, material: { select: { id: true, name: true } } },
  });
  const byMaterial = new Map<string, { name: string; quantity: number; amount: number }>();
  for (const c of concepts) {
    if (!c.material) continue;
    const cur = byMaterial.get(c.material.id) || { name: c.material.name, quantity: 0, amount: 0 };
    cur.quantity += c.quantity;
    cur.amount += c.totalAmount;
    byMaterial.set(c.material.id, cur);
  }
  const topMaterials = [...byMaterial.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);

  return {
    monthLabel: thisMonth.start.toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
    kpis: {
      income: income.amount,
      incomeChange: pctChange(income.amount, prevIncome.amount),
      incomeTax: income.tax,
      expense: expense.amount,
      expenseChange: pctChange(expense.amount, prevExpense.amount),
      profit,
      profitChange: pctChange(profit, prevProfit),
      receivable,
      receivableCount,
    },
    chart: months,
    chartTotals: {
      income: months.reduce((s, m) => s + m.income, 0),
      expense: months.reduce((s, m) => s + m.expense, 0),
    },
    pipeline,
    pipelineMonth: {
      created: monthQuotes.length,
      quotedAmount: liveMonthQuotes.reduce((s, q) => s + q.total, 0),
      conversionRate,
    },
    attention,
    dormantQuotes: dormantCount,
    topClients,
    activeTasks,
    tasksOpen,
    topMaterials,
  };
}
