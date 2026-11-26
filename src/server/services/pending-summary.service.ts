import { prisma } from '@/lib/prisma';
import { buildSummaryMessage, classifyContact, sortByOldest, type PendingItem } from '@/lib/pending-summary';
import { isAdminPhone, notifyAdmin } from './whatsapp.service';

/** Solo se revisan conversaciones con movimiento reciente: lo más viejo ya no es un pendiente accionable. */
const LOOKBACK_DAYS = 14;
export const PENDING_PATH = '/dashboard/chats/pendientes';

export async function getPendingItems(): Promise<PendingItem[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const contacts = await prisma.whatsAppContact.findMany({
    where: { archived: false, messages: { some: { timestamp: { gte: since } } } },
    select: {
      id: true,
      name: true,
      phone: true,
      // Sin mediaUrl: las fotos en base64 harían la consulta muy lenta.
      messages: {
        where: { timestamp: { gte: since } },
        select: { direction: true, type: true, content: true, timestamp: true, aiTrace: true },
      },
    },
  });
  const items = contacts.filter((c) => !isAdminPhone(c.phone)).map(classifyContact);
  return sortByOldest(items.filter((i): i is PendingItem => i !== null));
}

/** Arma el texto del resumen sin mandarlo. Sin pendientes, el texto viene vacío. */
export async function getPendingSummary() {
  const items = await getPendingItems();
  if (items.length === 0) return { total: 0, text: '' };
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://app.laserinova.com').replace(/\/$/, '');
  return { total: items.length, text: buildSummaryMessage(items, { now: new Date(), link: `${base}${PENDING_PATH}` }) };
}

/** Arma el resumen y, salvo en modo prueba, lo manda a los administradores (WhatsApp y push). */
export async function sendPendingSummary({ dryRun = false }: { dryRun?: boolean } = {}) {
  const { total, text } = await getPendingSummary();
  const sent = total > 0 && !dryRun;
  if (sent) await notifyAdmin(text, PENDING_PATH);
  return { sent, total, text };
}
