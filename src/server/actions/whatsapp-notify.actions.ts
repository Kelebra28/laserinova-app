'use server';

import { requireAuth } from '@/lib/auth';
import { getQuoteNoticeContext, sendQuoteNotice, sendReengage } from '@/server/services/whatsapp-notify.service';
import type { QuoteNoticeKind, NoticeExtra } from '@/lib/whatsapp-templates';

const KINDS: QuoteNoticeKind[] = ['production', 'ready', 'deposit', 'paid'];

export async function getQuoteNoticeContextAction(quoteId: string) {
  await requireAuth();
  try {
    return { success: true as const, data: await getQuoteNoticeContext(quoteId) };
  } catch (e) {
    return { success: false as const, error: (e instanceof Error && e.message) || 'No se pudo cargar la cotización.' };
  }
}

export async function sendQuoteNoticeAction(quoteId: string, kind: QuoteNoticeKind, extra: NoticeExtra) {
  await requireAuth();
  if (!KINDS.includes(kind)) return { success: false as const, error: 'Aviso no válido.' };
  try {
    await sendQuoteNotice(quoteId, kind, extra);
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: (e instanceof Error && e.message) || 'No se pudo mandar el aviso.' };
  }
}

/** Plantilla "retomar_conversacion" para reabrir un chat cuando ya pasaron 24 h. */
export async function sendReengageAction(contactId: string) {
  await requireAuth();
  try {
    const { text } = await sendReengage(contactId);
    return { success: true as const, text };
  } catch (e) {
    return { success: false as const, error: (e instanceof Error && e.message) || 'No se pudo mandar el mensaje.' };
  }
}
