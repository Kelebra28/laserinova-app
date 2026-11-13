import { prisma } from "@/lib/prisma";

/**
 * Dashboard "Ventas WhatsApp": todo sale de datos reales (solo lectura).
 * Ojo: WhatsAppMessage.content / mediaUrl pueden pesar MB (base64), por eso
 * aquí nunca se seleccionan; solo metadatos.
 */

const TZ = "America/Mexico_City";
const DAY = 24 * 60 * 60 * 1000;
const INCOME_TYPES = ["INGRESO", "ANTICIPO", "LIQUIDACION"];
const WON_STATUSES = ["APPROVED", "ACCEPTED", "IN_PRODUCTION", "DELIVERED", "DONE"];
const LOST_STATUSES = ["REJECTED", "CANCELLED"];
// Contactos del simulador del bot: no son clientes reales.
const SIMULATOR_PREFIX = "Cliente de Prueba";
const SENT_STATUSES = ["SENT", ...WON_STATUSES, ...LOST_STATUSES];

export type SalesGroupRow = {
  label: string;
  items: number; // conceptos cotizados
  units: number; // piezas
  quoted: number; // $ cotizado (sin IVA)
  won: number; // $ de cotizaciones aprobadas
  cost: number; // costo real de lo aprobado
  utility: number; // utilidad de lo aprobado
  winRate: number | null; // % del $ cotizado que se aprobó
};

export type WhatsAppSalesData = {
  rangeDays: number;
  generatedAt: string;
  funnel: {
    chats: number; // contactos con mensaje entrante en el periodo
    chatsWithQuote: number;
    quotesCreated: number;
    quotesSent: number;
    quotesWon: number;
    quotesLost: number;
    quotesPaid: number;
    amountSent: number;
    amountWon: number;
    amountCollected: number; // cobrado real (movimientos de ingreso) en el periodo
    avgTicketWon: number;
    closeRate: number | null; // ganadas / (ganadas + perdidas)
    chatToQuoteRate: number | null;
  };
  byType: SalesGroupRow[];
  byMaterial: SalesGroupRow[];
  byCategory: SalesGroupRow[];
  byProduct: SalesGroupRow[];
  receivable: {
    total: number;
    count: number;
    buckets: { label: string; amount: number; count: number }[];
    byClient: { client: string; amount: number; count: number; oldestDays: number }[];
  };
  response: {
    inbound: number;
    outbound: number;
    botReplies: number;
    humanReplies: number;
    botShare: number | null;
    medianFirstResponseMin: number | null;
    p90FirstResponseMin: number | null;
    unanswered: number; // chats cuyo último mensaje es del cliente
    perDay: { day: string; inbound: number; outbound: number }[];
    heatmap: number[][]; // [diaSemana 0=lun..6=dom][hora 0..23] mensajes entrantes
  };
  chats: {
    phone: string;
    name: string;
    client: string;
    inbound: number;
    outbound: number;
    lastMessage: string;
    botMode: boolean;
    quotes: number;
    quotedAmount: number;
    wonAmount: number;
    status: string; // etapa más avanzada
  }[];
};

function tzParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  return { ymd: `${get("year")}-${get("month")}-${get("day")}`, hour: parseInt(get("hour"), 10) % 24, weekday: wd };
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function newGroup(label: string): SalesGroupRow {
  return { label, items: 0, units: 0, quoted: 0, won: 0, cost: 0, utility: 0, winRate: null };
}

function finishGroups(map: Map<string, SalesGroupRow>): SalesGroupRow[] {
  return [...map.values()]
    .map((g) => ({ ...g, winRate: g.quoted > 0 ? (g.won / g.quoted) * 100 : null }))
    .sort((a, b) => b.quoted - a.quoted);
}

export async function getWhatsAppSalesService(rangeDays = 30): Promise<WhatsAppSalesData> {
  const now = new Date();
  const since = new Date(now.getTime() - rangeDays * DAY);

  const [messages, contacts, quotes, pendingQuotes, incomeTx] = await Promise.all([
    prisma.whatsAppMessage.findMany({
      where: { timestamp: { gte: since }, contact: { NOT: { name: { startsWith: SIMULATOR_PREFIX } } } },
      select: { contactId: true, direction: true, timestamp: true, aiTrace: true },
      orderBy: { timestamp: "asc" },
    }),
    prisma.whatsAppContact.findMany({
      where: { NOT: { name: { startsWith: SIMULATOR_PREFIX } } },
      select: { id: true, phone: true, name: true, botMode: true, client: { select: { name: true, company: true } } },
    }),
    prisma.quote.findMany({
      where: { active: true, createdAt: { gte: since }, status: { not: "DRAFT" } },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        subtotal: true,
        total: true,
        contactId: true,
        concepts: {
          select: {
            conceptType: true,
            description: true,
            quantity: true,
            totalAmount: true,
            realCost: true,
            material: { select: { name: true, category: { select: { name: true } } } },
            product: { select: { name: true, category: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.quote.findMany({
      where: {
        active: true,
        paymentStatus: { in: ["PENDING", "PARTIAL"] },
        // Solo es deuda lo que el cliente ya aprobó; una cotización enviada o calculada aún no se debe.
        status: { in: WON_STATUSES },
      },
      select: {
        total: true,
        realAmountCollected: true,
        sentDate: true,
        closeDate: true,
        createdAt: true,
        client: { select: { name: true, company: true } },
        contact: { select: { name: true, phone: true } },
        prospectName: true,
      },
    }),
    prisma.financialTransaction.aggregate({
      where: { isDeleted: false, type: { in: INCOME_TYPES }, date: { gte: since } },
      _sum: { amount: true },
    }),
  ]);

  // ── Mensajes: actividad, bot vs humano, tiempos de respuesta ────────────
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const perDayMap = new Map<string, { inbound: number; outbound: number }>();
  for (let i = rangeDays - 1; i >= 0; i--) {
    perDayMap.set(tzParts(new Date(now.getTime() - i * DAY)).ymd, { inbound: 0, outbound: 0 });
  }
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let inbound = 0;
  let outbound = 0;
  let botReplies = 0;
  let humanReplies = 0;
  const stats = new Map<string, { inbound: number; outbound: number; last: Date; lastDir: string }>();
  const waiting = new Map<string, Date>(); // contacto → primer entrante sin contestar
  const responseMins: number[] = [];

  for (const m of messages) {
    const p = tzParts(m.timestamp);
    const day = perDayMap.get(p.ymd);
    const s = stats.get(m.contactId) || { inbound: 0, outbound: 0, last: m.timestamp, lastDir: m.direction };
    s.last = m.timestamp;
    s.lastDir = m.direction;
    if (m.direction === "INBOUND") {
      inbound++;
      s.inbound++;
      if (day) day.inbound++;
      if (p.weekday >= 0) heatmap[p.weekday][p.hour]++;
      if (!waiting.has(m.contactId)) waiting.set(m.contactId, m.timestamp);
    } else {
      outbound++;
      s.outbound++;
      if (day) day.outbound++;
      if (m.aiTrace) botReplies++;
      else humanReplies++;
      const w = waiting.get(m.contactId);
      if (w) {
        responseMins.push((m.timestamp.getTime() - w.getTime()) / 60000);
        waiting.delete(m.contactId);
      }
    }
    stats.set(m.contactId, s);
  }
  responseMins.sort((a, b) => a - b);
  const unanswered = [...stats.values()].filter((s) => s.lastDir === "INBOUND").length;
  const chatIds = new Set([...stats.entries()].filter(([, s]) => s.inbound > 0).map(([id]) => id));

  // ── Cotizaciones: embudo y qué se vende ─────────────────────────────────
  const sentQuotes = quotes.filter((q) => SENT_STATUSES.includes(q.status));
  const wonQuotes = quotes.filter((q) => WON_STATUSES.includes(q.status));
  const lostQuotes = quotes.filter((q) => LOST_STATUSES.includes(q.status));
  const paidQuotes = wonQuotes.filter((q) => q.paymentStatus === "PAID");
  const amountSent = sentQuotes.reduce((s, q) => s + q.subtotal, 0);
  const amountWon = wonQuotes.reduce((s, q) => s + q.subtotal, 0);

  const types = new Map<string, SalesGroupRow>();
  const materials = new Map<string, SalesGroupRow>();
  const categories = new Map<string, SalesGroupRow>();
  const products = new Map<string, SalesGroupRow>();
  const bump = (map: Map<string, SalesGroupRow>, label: string, qty: number, amount: number, cost: number, won: boolean) => {
    const g = map.get(label) || newGroup(label);
    g.items++;
    g.units += qty;
    g.quoted += amount;
    if (won) {
      g.won += amount;
      g.cost += cost;
      g.utility += amount - cost;
    }
    map.set(label, g);
  };
  for (const q of sentQuotes) {
    const won = WON_STATUSES.includes(q.status);
    for (const c of q.concepts) {
      const cost = (c.realCost || 0) * (c.quantity || 1);
      bump(types, c.conceptType || "SIN TIPO", c.quantity, c.totalAmount, cost, won);
      if (c.material) {
        bump(materials, c.material.name, c.quantity, c.totalAmount, cost, won);
        bump(categories, c.material.category.name, c.quantity, c.totalAmount, cost, won);
      }
      if (c.product) bump(products, c.product.name, c.quantity, c.totalAmount, cost, won);
    }
  }

  // ── Por cobrar ──────────────────────────────────────────────────────────
  const bucketDefs = [
    { label: "0-7 días", max: 7 },
    { label: "8-15 días", max: 15 },
    { label: "16-30 días", max: 30 },
    { label: "+30 días", max: Infinity },
  ];
  const buckets = bucketDefs.map((b) => ({ label: b.label, amount: 0, count: 0 }));
  const byClientMap = new Map<string, { client: string; amount: number; count: number; oldestDays: number }>();
  let recTotal = 0;
  let recCount = 0;
  for (const q of pendingQuotes) {
    const owed = q.total - (q.realAmountCollected || 0);
    if (owed <= 0.5) continue;
    const ref = q.closeDate || q.sentDate || q.createdAt;
    const age = Math.max(0, Math.floor((now.getTime() - ref.getTime()) / DAY));
    const bi = bucketDefs.findIndex((b) => age <= b.max);
    buckets[bi].amount += owed;
    buckets[bi].count++;
    recTotal += owed;
    recCount++;
    const name = q.client?.company || q.client?.name || q.contact?.name || q.prospectName || q.contact?.phone || "Sin cliente";
    const row = byClientMap.get(name) || { client: name, amount: 0, count: 0, oldestDays: 0 };
    row.amount += owed;
    row.count++;
    row.oldestDays = Math.max(row.oldestDays, age);
    byClientMap.set(name, row);
  }

  // ── Tabla cruda por chat ────────────────────────────────────────────────
  const quotesByContact = new Map<string, typeof quotes>();
  for (const q of quotes) {
    if (!q.contactId) continue;
    quotesByContact.set(q.contactId, [...(quotesByContact.get(q.contactId) || []), q]);
  }
  const chats = [...stats.entries()]
    .map(([id, s]) => {
      const c = contactById.get(id);
      const qs = quotesByContact.get(id) || [];
      const won = qs.filter((q) => WON_STATUSES.includes(q.status));
      let status = "Solo chat";
      if (qs.length) status = "Cotizado";
      if (qs.some((q) => q.status === "SENT")) status = "Cotización enviada";
      if (won.length) status = "Aprobado";
      if (won.length && won.every((q) => q.paymentStatus === "PAID")) status = "Cobrado";
      else if (!won.length && qs.length && qs.every((q) => LOST_STATUSES.includes(q.status))) status = "Perdido";
      return {
        phone: c?.phone || "",
        name: c?.name || "",
        client: c?.client?.company || c?.client?.name || "",
        inbound: s.inbound,
        outbound: s.outbound,
        lastMessage: s.last.toISOString(),
        botMode: c?.botMode ?? true,
        quotes: qs.length,
        quotedAmount: qs.reduce((a, q) => a + q.subtotal, 0),
        wonAmount: won.reduce((a, q) => a + q.subtotal, 0),
        status,
      };
    })
    .sort((a, b) => b.lastMessage.localeCompare(a.lastMessage));

  const chatsWithQuote = [...chatIds].filter((id) => (quotesByContact.get(id) || []).length > 0).length;
  const decided = wonQuotes.length + lostQuotes.length;

  return {
    rangeDays,
    generatedAt: now.toISOString(),
    funnel: {
      chats: chatIds.size,
      chatsWithQuote,
      quotesCreated: quotes.length,
      quotesSent: sentQuotes.length,
      quotesWon: wonQuotes.length,
      quotesLost: lostQuotes.length,
      quotesPaid: paidQuotes.length,
      amountSent,
      amountWon,
      amountCollected: incomeTx._sum.amount || 0,
      avgTicketWon: wonQuotes.length ? amountWon / wonQuotes.length : 0,
      closeRate: decided > 0 ? (wonQuotes.length / decided) * 100 : null,
      chatToQuoteRate: chatIds.size > 0 ? (chatsWithQuote / chatIds.size) * 100 : null,
    },
    byType: finishGroups(types),
    byMaterial: finishGroups(materials),
    byCategory: finishGroups(categories),
    byProduct: finishGroups(products),
    receivable: {
      total: recTotal,
      count: recCount,
      buckets,
      byClient: [...byClientMap.values()].sort((a, b) => b.amount - a.amount),
    },
    response: {
      inbound,
      outbound,
      botReplies,
      humanReplies,
      botShare: botReplies + humanReplies > 0 ? (botReplies / (botReplies + humanReplies)) * 100 : null,
      medianFirstResponseMin: percentile(responseMins, 50),
      p90FirstResponseMin: percentile(responseMins, 90),
      unanswered,
      perDay: [...perDayMap.entries()].map(([day, v]) => ({ day: day.slice(5), ...v })),
      heatmap,
    },
    chats,
  };
}
