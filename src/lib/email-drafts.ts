import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getStorageBasePath } from "@/lib/emailStorage";
import { getEmailText } from "@/lib/email-body";
import { draftEmailReply } from "@/lib/agents/email/reply";

/**
 * Borradores de respuesta con IA. Viven en la tabla Email con folder = "DRAFTS" (sin migración):
 *  - threadId = Message-ID del correo que contestan (para ligarlos y no repetir),
 *  - el texto completo del borrador va en `snippet` y los metadatos (notas, cita) como JSON en `bcc`: así viven
 *    en la base de datos y no se pierden si un despliegue limpia el disco del servidor.
 * Nada se envía solo: la persona revisa el borrador y lo manda.
 */

export const DRAFTS_FOLDER = "DRAFTS";

const OWN_DOMAIN = /@laserinova\.com$/i;
const WEB_FORM = /^no-reply@laserinova\.com$/i;
const AUTOMATED = /(^|[._-])(no-?reply|donotreply|do-not-reply|mailer-daemon|postmaster|notifications?|newsletter|boletin|news|marketing|promo(?:ciones)?|alerts?|bounce)[._-]?[^@]*@/i;
const NOISE_DOMAINS = /@(accounts\.google\.com|facebookmail\.com|messaging\.whatsapp\.com|mail\.instagram\.com|linkedin\.com|e\.linkedin\.com)$/i;

const addrOf = (from: string) => (from.match(/<([^>]+)>/)?.[1] || from).trim().toLowerCase();

// ── Correos que la IA ya revisó y decidió no contestar (spam, automáticos…): para no volver a gastar una llamada ──
const skipsFile = () => path.join(getStorageBasePath(), "ai-skips.json");
function readSkips(): Record<string, string> {
  try { return JSON.parse(fs.readFileSync(skipsFile(), "utf-8")); } catch { return {}; }
}
function addSkip(emailId: string, reason: string) {
  const all = readSkips();
  all[emailId] = reason.slice(0, 200);
  try { fs.writeFileSync(skipsFile(), JSON.stringify(all)); } catch (e) { console.warn("No se pudo guardar el omitido:", e); }
}

/** Correos de la bandeja que merecen que la IA los revise: recientes, de fuera, sin respuesta ni borrador. */
export async function findPendingEmails(userId: string, days: number) {
  const since = new Date(Date.now() - days * 864e5);
  const [inbox, sent, drafts] = await Promise.all([
    prisma.email.findMany({
      // También Spam, pero SOLO lo que manda el propio formulario web: el filtro de Spam suele mandar ahí esos avisos
      where: { userId, folder: { in: ["INBOX", "SPAM"] }, receivedAt: { gte: since } },
      orderBy: { receivedAt: "desc" },
      select: { id: true, folder: true, messageId: true, from: true, subject: true, receivedAt: true },
    }),
    prisma.email.findMany({ where: { userId, folder: "SENT", receivedAt: { gte: since } }, select: { to: true, threadId: true } }),
    prisma.email.findMany({ where: { userId, folder: DRAFTS_FOLDER }, select: { threadId: true } }),
  ]);
  const skips = readSkips();
  const sentThreads = new Set(sent.map((s) => s.threadId).filter(Boolean));
  const draftedFor = new Set(drafts.map((d) => d.threadId).filter(Boolean));

  return inbox.filter((e) => {
    const addr = addrOf(e.from);
    if (e.folder === "SPAM" && !WEB_FORM.test(addr)) return false;
    if (skips[e.id] || draftedFor.has(e.messageId) || sentThreads.has(e.messageId)) return false;
    if (OWN_DOMAIN.test(addr) && !WEB_FORM.test(addr)) return false;
    if (!WEB_FORM.test(addr) && (AUTOMATED.test(addr) || NOISE_DOMAINS.test(addr))) return false;
    if (sent.some((s) => s.to.toLowerCase().includes(addr))) return false; // ya se le escribió a esa persona
    return true;
  });
}

function cleanQuote(text: string, fallback: string) {
  const lines: string[] = [];
  for (const line of text.replace(/\r/g, "").split("\n")) {
    if (/^\s*(El .{5,120} escribió:?|On .{5,120} wrote:?|-{2,}\s*(Original|Mensaje))/i.test(line)) break;
    if (/^\s*>/.test(line)) continue;
    lines.push(line.trimEnd());
  }
  return (lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() || fallback).split("\n").slice(0, 40).join("\n");
}

export type DraftResult =
  | { status: "DRAFT"; id: string; to: string; subject: string }
  | { status: "SKIP"; reason: string };

/** Lee el correo, redacta la respuesta con IA y la deja como borrador (o lo marca como "no contestar"). */
export async function createDraftForEmail(userId: string, emailId: string, opts: { explicit?: boolean } = {}): Promise<DraftResult> {
  const email = await prisma.email.findFirst({ where: { id: emailId, userId } });
  if (!email) throw new Error("Correo no encontrado");

  // Si ya hay borrador para este correo, se devuelve ese (no se gasta otra llamada ni se duplica)
  const existing = await prisma.email.findFirst({ where: { userId, folder: DRAFTS_FOLDER, threadId: email.messageId }, select: { id: true, to: true, subject: true } });
  if (existing) return { status: "DRAFT", id: existing.id, to: existing.to, subject: existing.subject };
  const me = (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email || "";

  const text = await getEmailText(userId, email);
  const fromName = email.from.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() || "";
  const draft = await draftEmailReply({
    fromName,
    fromAddress: addrOf(email.from),
    subject: email.subject,
    body: text,
    receivedAt: email.receivedAt,
  });

  if (draft.action !== "REPLY" || !draft.body || !draft.to) {
    const reason = draft.reason || "No requiere respuesta";
    addSkip(email.id, `${draft.category}: ${reason}`);
    return { status: "SKIP", reason };
  }

  // El mismo cliente suele escribir por el formulario web y por correo: un solo borrador por persona
  const dup = await prisma.email.findFirst({ where: { userId, folder: DRAFTS_FOLDER, to: draft.to }, select: { id: true } });
  if (dup && opts.explicit) {
    const d = await prisma.email.findUnique({ where: { id: dup.id }, select: { id: true, to: true, subject: true } });
    if (d) return { status: "DRAFT", id: d.id, to: d.to, subject: d.subject };
  }
  if (dup) {
    const reason = "Ya hay un borrador para este cliente (escribió por más de un canal)";
    addSkip(email.id, reason);
    return { status: "SKIP", reason };
  }

  const formattedDate = email.receivedAt.toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short", timeZone: "America/Mexico_City" });
  const meta = {
    category: draft.category,
    reason: draft.reason,
    notes: draft.notes,
    originalId: email.id,
    originalMessageId: email.messageId,
    quoteHeader: `El ${formattedDate}, ${email.from.replace(/"/g, "")} escribió:`,
    quoteBody: cleanQuote(text, email.snippet || ""),
  };

  const id = randomUUID();
  const subject = draft.subject || (/^re:/i.test(email.subject) ? email.subject : `Re: ${email.subject}`);
  await prisma.email.create({
    data: {
      id,
      userId,
      folder: DRAFTS_FOLDER,
      messageId: `draft-${id}@local`,
      threadId: email.messageId,
      subject,
      from: me ? `"Borrador IA" <${me}>` : "Borrador IA",
      to: draft.to,
      snippet: draft.body,
      bcc: JSON.stringify(meta),
      isRead: false,
      receivedAt: new Date(),
      clientId: email.clientId,
    },
  });
  return { status: "DRAFT", id, to: draft.to, subject };
}

export async function getDraft(userId: string, id: string) {
  const row = await prisma.email.findFirst({ where: { id, userId, folder: DRAFTS_FOLDER } });
  if (!row) return null;
  let meta: any = {};
  try { meta = JSON.parse(row.bcc || "{}"); } catch { /* sin metadatos */ }
  return {
    id: row.id,
    to: row.to,
    subject: row.subject,
    text: row.snippet || "",
    notes: meta.notes || "",
    reason: meta.reason || "",
    category: meta.category || "",
    inReplyTo: row.threadId || "",
    quoteHeader: meta.quoteHeader || "",
    quoteBody: meta.quoteBody || "",
  };
}

export async function discardDraft(userId: string, id: string) {
  const row = await prisma.email.findFirst({ where: { id, userId, folder: DRAFTS_FOLDER }, select: { id: true } });
  if (!row) return false;
  await prisma.email.delete({ where: { id: row.id } });
  return true;
}

// ── Pestaña "Cotizaciones": correos que piden cotizar, con su estado de atención ──
export type QuoteStatus = "PENDING" | "DRAFT" | "ANSWERED";
const QUOTE_WORDS = ["cotiz", "presupuesto", "precio", "quote", "pricing", "cuánto cuesta", "cuanto cuesta"];

/**
 * Correos de los últimos `days` días que piden cotización (por palabras, más todo lo que manda el formulario
 * web, aunque haya caído en Spam), con su estado: sin contestar, borrador listo o contestado. Los que la IA ya
 * descartó (spam, ventas en frío, phishing, pruebas) no salen.
 */
export async function listQuoteEmails(userId: string, days: number) {
  const since = new Date(Date.now() - days * 864e5);
  const formFrom = { from: { contains: "no-reply@laserinova.com" } };
  const [rows, sent, drafts] = await Promise.all([
    prisma.email.findMany({
      where: {
        userId,
        receivedAt: { gte: since },
        OR: [
          { folder: "INBOX", OR: [...QUOTE_WORDS.flatMap((w) => [{ subject: { contains: w } }, { snippet: { contains: w } }]), formFrom] },
          { folder: "SPAM", ...formFrom },
        ],
      },
      orderBy: { receivedAt: "desc" },
      take: 300,
      select: { id: true, messageId: true, uid: true, folder: true, from: true, to: true, cc: true, subject: true, snippet: true, receivedAt: true, isRead: true, isStarred: true, clientId: true },
    }),
    prisma.email.findMany({ where: { userId, folder: "SENT", receivedAt: { gte: since } }, select: { to: true, threadId: true } }),
    prisma.email.findMany({ where: { userId, folder: DRAFTS_FOLDER }, select: { threadId: true } }),
  ]);
  const skips = readSkips();
  const sentThreads = new Set(sent.map((s) => s.threadId).filter(Boolean));
  const draftThreads = new Set(drafts.map((d) => d.threadId).filter(Boolean));

  const out = rows
    .filter((e) => {
      const addr = addrOf(e.from);
      if (skips[e.id]) return false;
      if (OWN_DOMAIN.test(addr) && !WEB_FORM.test(addr)) return false;
      if (!WEB_FORM.test(addr) && (AUTOMATED.test(addr) || NOISE_DOMAINS.test(addr))) return false;
      return true;
    })
    .map((e) => {
      const addr = addrOf(e.from);
      const answered = sentThreads.has(e.messageId) || (!WEB_FORM.test(addr) && sent.some((s) => s.to.toLowerCase().includes(addr)));
      const quoteStatus: QuoteStatus = answered ? "ANSWERED" : draftThreads.has(e.messageId) ? "DRAFT" : "PENDING";
      return { ...e, attachments: [] as { filename: string; size: number }[], quoteStatus };
    });

  const rank: Record<QuoteStatus, number> = { PENDING: 0, DRAFT: 1, ANSWERED: 2 };
  out.sort((a, b) => rank[a.quoteStatus] - rank[b.quoteStatus] || b.receivedAt.getTime() - a.receivedAt.getTime());
  return out;
}

/** "Dar por perdida": el correo deja de contar como cotización pendiente (sigue en la bandeja; no se borra nada). */
export async function dismissEmails(userId: string, ids: string[], reason = "Dada por perdida") {
  const rows = await prisma.email.findMany({ where: { userId, id: { in: ids } }, select: { id: true } });
  for (const r of rows) addSkip(r.id, `perdida: ${reason}`);
  return rows.length;
}

// ── Borrador automático al llegar el correo (lo dispara el cron y la revisión rápida de la pantalla) ──
const drafting = new Set<string>();
const failedAt = new Map<string, number>(); // correo → cuándo falló: no se reintenta en 10 min (evita gastar llamadas en un error fijo)

/** Redacta borradores de los correos recientes (últimos 2 días) que merecen respuesta y aún no tienen. Nunca envía. */
export async function autoDraftNew(userId: string, max = 3): Promise<{ drafts: number; items: { to: string; subject: string }[] }> {
  if (process.env.EMAIL_AUTO_DRAFT === "off" || drafting.has(userId) || !process.env.GEMINI_API_KEY) return { drafts: 0, items: [] };
  drafting.add(userId);
  try {
    const now = Date.now();
    const pending = (await findPendingEmails(userId, 2)).filter((e) => now - (failedAt.get(e.id) || 0) > 10 * 60 * 1000).slice(0, max);
    const items: { to: string; subject: string }[] = [];
    for (const e of pending) {
      try {
        const r = await createDraftForEmail(userId, e.id);
        if (r.status === "DRAFT") items.push({ to: r.to, subject: r.subject });
      } catch (err: any) {
        failedAt.set(e.id, Date.now());
        console.warn("autoDraftNew:", String(err?.message || err).slice(0, 120));
      }
    }
    return { drafts: items.length, items };
  } finally {
    drafting.delete(userId);
  }
}
