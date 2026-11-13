import { prisma } from "@/lib/prisma";

/**
 * Resumen del dashboard por periodo: finanzas + actividad de WhatsApp.
 * Solo lectura. Nunca se selecciona content/mediaUrl de los mensajes (pueden pesar MB);
 * únicamente metadatos (contacto, dirección, fecha).
 */

import {
  AGING_BUCKETS,
  CLIENT_PROMISE_REGEX,
  CONVERSATION_CLOSER_MAX_CHARS,
  CONVERSATION_CLOSER_REGEX,
  DASHBOARD_RANGE_LABELS,
  FUNNEL_COLORS,
  DASHBOARD_TZ,
  DASHBOARD_TZ_OFFSET,
  DAY_MS,
  EXPENSE_TYPES,
  HEATMAP_DAYS,
  INCOME_TYPES,
  LOST_STATUSES,
  MESSAGE_TYPE_LABELS,
  OPEN_QUOTES_LOOKBACK_DAYS,
  OPEN_QUOTE_STATUSES,
  PENDING_GROUP_ORDER,
  PENDING_LIST_SIZE,
  PENDING_PREVIEW_CHARS,
  PENDING_STALE_DAYS,
  QUOTE_IDLE_MAX_DAYS,
  SENT_STATUSES,
  SERIES_DAYS,
  SERIES_MONTHS,
  SERIES_WEEKS,
  SIMULATOR_PREFIX,
  SPARK_DAYS,
  UNANSWERED_GRACE_MIN,
  WON_STATUSES,
  type PendingGroupKey,
} from "@/constants/dashboard.constants";
import type { DashboardRange } from "@/types/dashboard";

export type { DashboardRange };

const TZ = DASHBOARD_TZ;
const TZ_OFFSET = DASHBOARD_TZ_OFFSET;
const DAY = DAY_MS;
const NOT_SIMULATOR = { NOT: { name: { startsWith: SIMULATOR_PREFIX } } };
type PendingGroup = PendingGroupKey;
const GROUP_ORDER = PENDING_GROUP_ORDER;
const CLIENT_PROMISE = CLIENT_PROMISE_REGEX;
const CONVERSATION_CLOSER = CONVERSATION_CLOSER_REGEX;
const STALE_DAYS = PENDING_STALE_DAYS;
const RANGE_LABELS = DASHBOARD_RANGE_LABELS;

const ymdFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hour: "2-digit", hourCycle: "h23", weekday: "short" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ymdOf = (d: Date) => ymdFmt.format(d);
const startOfDay = (ymd: string) => new Date(`${ymd}T00:00:00${TZ_OFFSET}`);
const addDaysYmd = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const labelOf = (ymd: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString("es-MX", { ...opts, timeZone: "UTC" }).replace(".", "");

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

type Window = { start: Date; end: Date };

function windows(range: DashboardRange, now: Date): { cur: Window; prev: Window } {
  const today = ymdOf(now);
  if (range === "today") {
    const start = startOfDay(today);
    const elapsed = now.getTime() - start.getTime();
    return { cur: { start, end: now }, prev: { start: new Date(start.getTime() - DAY), end: new Date(start.getTime() - DAY + elapsed) } };
  }
  if (range === "month") {
    const start = startOfDay(`${today.slice(0, 7)}-01`);
    const prevMonthStart = startOfDay(`${addDaysYmd(`${today.slice(0, 7)}-01`, -1).slice(0, 7)}-01`);
    const elapsed = now.getTime() - start.getTime();
    return { cur: { start, end: now }, prev: { start: prevMonthStart, end: new Date(prevMonthStart.getTime() + elapsed) } };
  }
  const days = range === "7d" ? 7 : 30;
  const start = startOfDay(addDaysYmd(today, -(days - 1)));
  return { cur: { start, end: now }, prev: { start: new Date(start.getTime() - days * DAY), end: start } };
}

type Row = { id: string; contactId: string; direction: string; timestamp: Date };

function windowMetrics(rows: Row[], w: Window) {
  let inbound = 0;
  let outbound = 0;
  const writers = new Set<string>(); // usuarios distintos que escribieron
  const waiting = new Map<string, Date>();
  const mins: number[] = [];
  for (const m of rows) {
    if (m.timestamp < w.start || m.timestamp > w.end) continue;
    if (m.direction === "INBOUND") {
      inbound++;
      writers.add(m.contactId);
      if (!waiting.has(m.contactId)) waiting.set(m.contactId, m.timestamp);
    } else {
      outbound++;
      const t = waiting.get(m.contactId);
      if (t) {
        mins.push((m.timestamp.getTime() - t.getTime()) / 60000);
        waiting.delete(m.contactId);
      }
    }
  }
  mins.sort((a, b) => a - b);
  return { inbound, outbound, writers: writers.size, median: percentile(mins, 50), p90: percentile(mins, 90), answered: mins.length };
}

async function sumTx(types: string[], w: Window) {
  const r = await prisma.financialTransaction.aggregate({
    where: { isDeleted: false, type: { in: types }, date: { gte: w.start, lte: w.end } },
    _sum: { amount: true },
  });
  return r._sum.amount || 0;
}

export async function getDashboardOverviewService(range: DashboardRange) {
  const now = new Date();
  const today = ymdOf(now);
  const { cur, prev } = windows(range, now);

  // Historia de mensajes: 12 meses, suficiente para las series diaria, semanal y mensual.
  const historyFrom = startOfDay(`${addDaysYmd(`${today.slice(0, 7)}-01`, -1).slice(0, 7)}-01`);
  const histStart = new Date(Math.min(historyFrom.getTime(), now.getTime() - 366 * DAY));
  const sparkStart = startOfDay(addDaysYmd(today, -(SPARK_DAYS - 1)));

  const [rows, curIncome, prevIncome, curExpense, prevExpense, sparkTx, botReplies, newContacts, prevNewContacts, waQuotes, owedQuotes, contactDates, openQuotes] = await Promise.all([
    prisma.whatsAppMessage.findMany({
      where: { timestamp: { gte: histStart }, contact: NOT_SIMULATOR },
      select: { id: true, contactId: true, direction: true, timestamp: true },
      orderBy: { timestamp: "asc" },
    }),
    sumTx(INCOME_TYPES, cur),
    sumTx(INCOME_TYPES, prev),
    sumTx(EXPENSE_TYPES, cur),
    sumTx(EXPENSE_TYPES, prev),
    prisma.financialTransaction.findMany({
      where: { isDeleted: false, type: { in: [...INCOME_TYPES, ...EXPENSE_TYPES] }, date: { gte: sparkStart } },
      select: { type: true, amount: true, date: true },
    }),
    prisma.whatsAppMessage.count({
      where: { direction: "OUTBOUND", aiTrace: { not: null }, timestamp: { gte: cur.start, lte: cur.end }, contact: NOT_SIMULATOR },
    }),
    prisma.whatsAppContact.count({ where: { createdAt: { gte: cur.start, lte: cur.end }, ...NOT_SIMULATOR } }),
    prisma.whatsAppContact.count({ where: { createdAt: { gte: prev.start, lte: prev.end }, ...NOT_SIMULATOR } }),
    // Cotizaciones que nacieron de un chat de WhatsApp, creadas en el periodo (para el embudo).
    prisma.quote.findMany({
      where: { active: true, status: { not: "DRAFT" }, contactId: { not: null }, createdAt: { gte: cur.start, lte: cur.end }, contact: NOT_SIMULATOR },
      select: { status: true, paymentStatus: true, subtotal: true, contactId: true },
    }),
    // Por cobrar (global): solo es deuda lo que el cliente ya aprobó.
    prisma.quote.findMany({
      where: { active: true, paymentStatus: { in: ["PENDING", "PARTIAL"] }, status: { in: WON_STATUSES } },
      select: {
        total: true,
        realAmountCollected: true,
        sentDate: true,
        closeDate: true,
        createdAt: true,
        prospectName: true,
        client: { select: { name: true, company: true } },
        contact: { select: { name: true, phone: true } },
      },
    }),
    // Fecha de alta de cada contacto: separa usuarios nuevos de recurrentes en las gráficas.
    prisma.whatsAppContact.findMany({ where: NOT_SIMULATOR, select: { id: true, createdAt: true } }),
    // Cotizaciones vivas ligadas a un chat: dicen de qué lado está la pelota.
    prisma.quote.findMany({
      where: {
        active: true,
        status: { in: OPEN_QUOTE_STATUSES },
        contactId: { not: null },
        createdAt: { gte: new Date(now.getTime() - OPEN_QUOTES_LOOKBACK_DAYS * DAY) },
        contact: NOT_SIMULATOR,
      },
      select: { contactId: true, status: true, folio: true, project: true, createdAt: true, sentDate: true },
    }),
  ]);

  // ── Finanzas ──────────────────────────────────────────────────────────────
  const sparkDays = Array.from({ length: SPARK_DAYS }, (_, i) => addDaysYmd(today, i - (SPARK_DAYS - 1)));
  const incomeByDay = new Map(sparkDays.map((d) => [d, 0]));
  const profitByDay = new Map(sparkDays.map((d) => [d, 0]));
  for (const t of sparkTx) {
    const d = ymdOf(t.date);
    if (!incomeByDay.has(d)) continue;
    const isIncome = INCOME_TYPES.includes(t.type);
    if (isIncome) incomeByDay.set(d, (incomeByDay.get(d) || 0) + t.amount);
    profitByDay.set(d, (profitByDay.get(d) || 0) + (isIncome ? t.amount : -t.amount));
  }

  const curProfit = curIncome - curExpense;
  const prevProfit = prevIncome - prevExpense;

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  const curM = windowMetrics(rows, cur);
  const prevM = windowMetrics(rows, prev);

  type Bucket = { inbound: number; outbound: number; writers: Set<string> };
  const newBucket = (): Bucket => ({ inbound: 0, outbound: 0, writers: new Set() });
  const createdYmd = new Map(contactDates.map((c) => [c.id, ymdOf(c.createdAt)]));

  const dayMap = new Map<string, Bucket>();
  for (let i = SERIES_DAYS - 1; i >= 0; i--) dayMap.set(addDaysYmd(today, -i), newBucket());
  const mondayCache = new Map<string, string>();
  const mondayOf = (ymd: string) => {
    let m = mondayCache.get(ymd);
    if (!m) {
      const wd = WEEKDAYS.indexOf(hourFmt.formatToParts(startOfDay(ymd)).find((p) => p.type === "weekday")?.value || "Mon");
      m = addDaysYmd(ymd, -Math.max(wd, 0));
      mondayCache.set(ymd, m);
    }
    return m;
  };
  const weekMap = new Map<string, Bucket>();
  const thisMonday = mondayOf(today);
  for (let i = SERIES_WEEKS - 1; i >= 0; i--) weekMap.set(addDaysYmd(thisMonday, -7 * i), newBucket());
  const monthMap = new Map<string, Bucket>();
  {
    let cursor = `${today.slice(0, 7)}-01`;
    const keys: string[] = [];
    for (let i = 0; i < SERIES_MONTHS; i++) {
      keys.unshift(cursor.slice(0, 7));
      cursor = `${addDaysYmd(cursor, -1).slice(0, 7)}-01`;
    }
    keys.forEach((k) => monthMap.set(k, newBucket()));
  }

  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const heatSince = now.getTime() - HEATMAP_DAYS * DAY;
  const waitingSince = new Map<string, Date>(); // contacto → primer entrante sin contestar
  const lastDir = new Map<string, string>();
  const lastTs = new Map<string, Date>();
  const lastInboundId = new Map<string, string>();

  for (const m of rows) {
    const ymd = ymdOf(m.timestamp);
    const inbound = m.direction === "INBOUND";
    const key = inbound ? "inbound" : "outbound";
    for (const b of [dayMap.get(ymd), weekMap.get(mondayOf(ymd)), monthMap.get(ymd.slice(0, 7))]) {
      if (!b) continue;
      b[key]++;
      if (inbound) b.writers.add(m.contactId);
    }
    lastDir.set(m.contactId, m.direction);
    lastTs.set(m.contactId, m.timestamp);

    if (inbound) {
      lastInboundId.set(m.contactId, m.id);
      if (m.timestamp.getTime() >= heatSince) {
        const parts = hourFmt.formatToParts(m.timestamp);
        const wd = WEEKDAYS.indexOf(parts.find((p) => p.type === "weekday")?.value || "");
        const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10) % 24;
        if (wd >= 0) heatmap[wd][hour]++;
      }
      if (!waitingSince.has(m.contactId)) waitingSince.set(m.contactId, m.timestamp);
    } else {
      waitingSince.delete(m.contactId);
    }
  }

  const toSeries = (map: Map<string, Bucket>, startOf: (k: string) => string, label: (k: string) => string) =>
    [...map.entries()].map(([k, b]) => {
      const start = startOf(k);
      const fresh = [...b.writers].filter((id) => (createdYmd.get(id) || "0000") >= start).length;
      return { label: label(k), inbound: b.inbound, outbound: b.outbound, contacts: b.writers.size, newContacts: fresh, returning: b.writers.size - fresh };
    });

  // ── ¿De quién es la pelota? ───────────────────────────────────────────────
  // Te toca a ti:  respond (el cliente escribió y nadie contestó) · quote (hay cotización sin enviar).
  // Del cliente:   clientSend (él quedó de enviar/confirmar algo) · quoteSent (se le mandó cotización y no responde).
  const quotesBy = new Map<string, { open?: (typeof openQuotes)[number]; sent?: (typeof openQuotes)[number] }>();
  for (const q of openQuotes) {
    if (!q.contactId) continue;
    const e = quotesBy.get(q.contactId) || {};
    const slot = q.status === "SENT" ? "sent" : "open";
    if (!e[slot] || e[slot]!.createdAt < q.createdAt) e[slot] = q;
    quotesBy.set(q.contactId, e);
  }

  type Pending = { contactId: string; group: PendingGroup; since: Date; detail: string; messageId?: string };
  const pendings: Pending[] = [];
  for (const [contactId, dir] of lastDir) {
    const last = lastTs.get(contactId)!;
    const q = quotesBy.get(contactId);
    const idleDays = (now.getTime() - last.getTime()) / DAY;
    if (q?.open && idleDays <= QUOTE_IDLE_MAX_DAYS) {
      pendings.push({ contactId, group: "quote", since: q.open.createdAt, detail: `${q.open.folio} · ${q.open.project || "sin enviar"}` });
    } else if (dir === "INBOUND") {
      const since = waitingSince.get(contactId);
      if (since && (now.getTime() - since.getTime()) / 60000 >= UNANSWERED_GRACE_MIN && idleDays <= STALE_DAYS) {
        pendings.push({ contactId, group: "respond", since, detail: "", messageId: lastInboundId.get(contactId) });
      }
    } else if (q?.sent) {
      const sentAt = q.sent.sentDate || q.sent.createdAt;
      pendings.push({ contactId, group: "quoteSent", since: sentAt, detail: `${q.sent.folio} · ${q.sent.project || "enviada"}` });
    }
  }

  // Último mensaje del cliente: sirve de vista previa y para detectar "te lo mando".
  const previewIds = pendings.map((p) => p.messageId).filter((id): id is string => !!id);
  const previewRows = previewIds.length
    ? await prisma.whatsAppMessage.findMany({ where: { id: { in: previewIds } }, select: { id: true, type: true, content: true } })
    : [];
  const previewById = new Map(previewRows.map((r) => [r.id, r]));
  const TYPE_LABEL = MESSAGE_TYPE_LABELS;
  const closed = new Set<Pending>();
  for (const p of pendings) {
    if (!p.messageId) continue;
    const r = previewById.get(p.messageId);
    const text = (r?.content || "").replace(/\s+/g, " ").trim();
    if (text && text.length <= CONVERSATION_CLOSER_MAX_CHARS && CONVERSATION_CLOSER.test(text)) closed.add(p);
    if (text && CLIENT_PROMISE.test(text)) p.group = "clientSend";
    p.detail = text ? `“${text.length > PENDING_PREVIEW_CHARS ? `${text.slice(0, PENDING_PREVIEW_CHARS)}…` : text}”` : TYPE_LABEL[r?.type || ""] || "Mensaje sin texto";
  }

  const grouped = Object.fromEntries(GROUP_ORDER.map((g) => [g, pendings.filter((p) => p.group === g && !closed.has(p)).sort((a, b) => a.since.getTime() - b.since.getTime())])) as Record<PendingGroup, Pending[]>;
  const shown = GROUP_ORDER.flatMap((g) => grouped[g].slice(0, PENDING_LIST_SIZE));
  const shownContacts = shown.length
    ? await prisma.whatsAppContact.findMany({
        where: { id: { in: shown.map((t) => t.contactId) } },
        select: { id: true, phone: true, name: true, botMode: true, client: { select: { name: true, company: true } } },
      })
    : [];
  const contactById = new Map(shownContacts.map((c) => [c.id, c]));
  const view = (g: PendingGroup) => ({
    count: grouped[g].length,
    list: grouped[g].slice(0, PENDING_LIST_SIZE).map((t) => {
      const c = contactById.get(t.contactId);
      return {
        contactId: t.contactId,
        name: c?.client?.company || c?.client?.name || c?.name || c?.phone || "Sin nombre",
        botMode: c?.botMode ?? true,
        waitMin: (now.getTime() - t.since.getTime()) / 60000,
        detail: t.detail,
      };
    }),
  });

  // ── Embudo de WhatsApp (periodo actual) ───────────────────────────────────
  const chatIds = new Set<string>();
  for (const m of rows) if (m.direction === "INBOUND" && m.timestamp >= cur.start && m.timestamp <= cur.end) chatIds.add(m.contactId);
  const sent = waQuotes.filter((q) => SENT_STATUSES.includes(q.status));
  const won = waQuotes.filter((q) => WON_STATUSES.includes(q.status));
  const lost = waQuotes.filter((q) => LOST_STATUSES.includes(q.status));
  const paid = won.filter((q) => q.paymentStatus === "PAID");
  const sum = (qs: { subtotal: number }[]) => qs.reduce((a, q) => a + q.subtotal, 0);
  const quotedContacts = new Set(waQuotes.map((q) => q.contactId).filter((id): id is string => !!id));
  const funnel = [
    { key: "chats", label: "Chats que escribieron", count: chatIds.size, amount: null as number | null, color: FUNNEL_COLORS.chats },
    { key: "quoted", label: "Con cotización", count: [...chatIds].filter((id) => quotedContacts.has(id)).length, amount: null, color: FUNNEL_COLORS.quoted },
    // "sent" cuenta cotizaciones (un chat puede tener varias), por eso no se compara contra chats.
    { key: "sent", label: "Cotizaciones enviadas", count: sent.length, amount: sum(sent), color: FUNNEL_COLORS.sent },
    { key: "won", label: "Aprobadas", count: won.length, amount: sum(won), color: FUNNEL_COLORS.won },
    { key: "paid", label: "Cobradas por completo", count: paid.length, amount: sum(paid), color: FUNNEL_COLORS.paid },
  ].map((step, i, all) => ({ ...step, conversion: i === 0 || step.key === "sent" || all[i - 1].count === 0 ? null : (step.count / all[i - 1].count) * 100 }));
  const decided = won.length + lost.length;

  // ── Por cobrar por antigüedad ─────────────────────────────────────────────
  const agingDefs = AGING_BUCKETS;
  const aging = agingDefs.map((b) => ({ label: b.label, color: b.color, amount: 0, count: 0 }));
  const debtors = new Map<string, { client: string; amount: number; count: number; oldestDays: number }>();
  let owedTotal = 0;
  for (const q of owedQuotes) {
    const owed = q.total - (q.realAmountCollected || 0);
    if (owed <= 0.5) continue;
    const ref = q.closeDate || q.sentDate || q.createdAt;
    const age = Math.max(0, Math.floor((now.getTime() - ref.getTime()) / DAY));
    const b = aging[agingDefs.findIndex((d) => age <= d.max)];
    b.amount += owed;
    b.count++;
    owedTotal += owed;
    const name = q.client?.company || q.client?.name || q.contact?.name || q.prospectName || q.contact?.phone || "Sin cliente";
    const row = debtors.get(name) || { client: name, amount: 0, count: 0, oldestDays: 0 };
    row.amount += owed;
    row.count++;
    row.oldestDays = Math.max(row.oldestDays, age);
    debtors.set(name, row);
  }

  const dailyInbound = [...dayMap.values()].slice(-SPARK_DAYS).map((d) => d.inbound);
  const dailyWriters = [...dayMap.values()].slice(-SPARK_DAYS).map((d) => d.writers.size);

  return {
    range,
    rangeLabel: RANGE_LABELS[range],
    generatedAt: now.toISOString(),
    finance: {
      income: { value: curIncome, change: pctChange(curIncome, prevIncome) },
      expense: { value: curExpense, change: pctChange(curExpense, prevExpense) },
      profit: { value: curProfit, change: pctChange(curProfit, prevProfit) },
      spark: { income: sparkDays.map((d) => incomeByDay.get(d) || 0), profit: sparkDays.map((d) => profitByDay.get(d) || 0) },
    },
    funnel: {
      steps: funnel,
      closeRate: decided > 0 ? (won.length / decided) * 100 : null,
      avgTicket: won.length > 0 ? sum(won) / won.length : null,
      lostCount: lost.length,
    },
    receivable: {
      total: owedTotal,
      aging,
      topDebtors: [...debtors.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
    },
    whatsapp: {
      inbound: { value: curM.inbound, change: pctChange(curM.inbound, prevM.inbound) },
      outbound: { value: curM.outbound, change: pctChange(curM.outbound, prevM.outbound) },
      medianResponseMin: curM.median,
      p90ResponseMin: curM.p90,
      responseChange: curM.median !== null && prevM.median !== null ? pctChange(curM.median, prevM.median) : null,
      answered: curM.answered,
      botReplies,
      humanReplies: Math.max(curM.outbound - botReplies, 0),
      botShare: curM.outbound > 0 ? (botReplies / curM.outbound) * 100 : null,
      newContacts: { value: newContacts, change: pctChange(newContacts, prevNewContacts) },
      writers: { value: curM.writers, change: pctChange(curM.writers, prevM.writers) },
      pending: {
        // "Te toca a ti" = por responder + falta cotización. "Del cliente" = lo que se espera de él.
        mine: grouped.respond.length + grouped.quote.length,
        theirs: grouped.clientSend.length + grouped.quoteSent.length,
        groups: { respond: view("respond"), quote: view("quote"), clientSend: view("clientSend"), quoteSent: view("quoteSent") },
      },
      sparkInbound: dailyInbound,
      sparkWriters: dailyWriters,
      series: {
        day: toSeries(dayMap, (k) => k, (k) => labelOf(k, { day: "numeric", month: "short" })),
        week: toSeries(weekMap, (k) => k, (k) => `Sem ${labelOf(k, { day: "numeric", month: "short" })}`),
        month: toSeries(monthMap, (k) => `${k}-01`, (k) => labelOf(`${k}-01`, { month: "short", year: "2-digit" })),
      },
      heatmap,
    },
  };
}

export type DashboardOverview = Awaited<ReturnType<typeof getDashboardOverviewService>>;
