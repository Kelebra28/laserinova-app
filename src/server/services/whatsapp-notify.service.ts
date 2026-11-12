import { prisma } from '@/lib/prisma';
import { notificationEmitter } from '@/lib/notification-emitter';
import { sendMessageToMeta } from './whatsapp.service';
import {
  CLIENT_TEMPLATES, renderTemplate, cleanParam, noticeParams,
  type ClientTemplateKey, type QuoteNoticeKind, type NoticeExtra, type NoticeQuote,
} from '@/lib/whatsapp-templates';

type Contact = { id: string; phone: string; name: string | null };

/**
 * Manda una plantilla de cliente y la deja guardada en el chat como mensaje enviado.
 * Lanza Error con un mensaje legible si Meta la rechaza.
 */
export async function sendClientTemplate(contact: Contact, key: ClientTemplateKey, rawParams: string[]) {
  const params = rawParams.map(cleanParam);
  if (params.some(p => !p)) throw new Error('Falta llenar algún dato del mensaje.');
  const text = renderTemplate(key, params);

  let messageId = `local_tpl_${Date.now()}`;
  if (!contact.name?.includes('Simulador')) {
    try {
      const res = await sendMessageToMeta(contact.phone, {
        type: 'template',
        template: {
          name: CLIENT_TEMPLATES[key].name,
          language: { code: 'es_MX' },
          components: [{ type: 'body', parameters: params.map(text => ({ type: 'text', text })) }],
        },
      });
      if (!res) throw new Error('Faltan las variables de WhatsApp en el servidor.');
      messageId = res.messages?.[0]?.id ?? messageId;
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : '');
      throw new Error(/132001|does not exist/i.test(msg)
        ? `La plantilla "${CLIENT_TEMPLATES[key].name}" todavía no está aprobada en Meta.`
        : `WhatsApp rechazó el mensaje: ${msg}`);
    }
  }

  const saved = await prisma.whatsAppMessage.create({
    data: { contactId: contact.id, messageId, direction: 'OUTBOUND', type: 'TEXT', content: text, status: 'SENT' },
  });
  await notificationEmitter.emit('whatsapp_message', { message: saved, contact }).catch(() => {});
  return { text };
}

async function quoteWithContact(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { id: true, folio: true, total: true, realAmountCollected: true, deliveryTime: true, contactId: true, clientId: true },
  });
  if (!quote) throw new Error('Cotización no encontrada.');
  const contact = (quote.contactId || quote.clientId)
    ? await prisma.whatsAppContact.findFirst({
        where: quote.contactId ? { id: quote.contactId } : { clientId: quote.clientId },
        select: { id: true, phone: true, name: true },
      })
    : null;
  return { quote, contact };
}

function noticeQuote(quote: Awaited<ReturnType<typeof quoteWithContact>>['quote']): NoticeQuote {
  return { folio: quote.folio, deliveryTime: quote.deliveryTime, balance: Math.max(0, quote.total - (quote.realAmountCollected || 0)) };
}

/** Datos para el modal: a quién le llegaría y los datos de la cotización para la vista previa. */
export async function getQuoteNoticeContext(quoteId: string) {
  const { quote, contact } = await quoteWithContact(quoteId);
  return {
    contactName: contact ? (contact.name || `+${contact.phone}`) : null,
    quote: noticeQuote(quote),
  };
}

export async function sendQuoteNotice(quoteId: string, kind: QuoteNoticeKind, extra: NoticeExtra) {
  const { quote, contact } = await quoteWithContact(quoteId);
  if (!contact) throw new Error('Esta cotización no tiene un chat de WhatsApp asociado.');
  return sendClientTemplate(contact, kind, noticeParams(kind, noticeQuote(quote), extra));
}

/** Cotización activa más reciente del chat (por contacto o por su cliente). */
export async function latestQuoteForContact(contactId: string, clientId?: string | null) {
  if (clientId === undefined) {
    clientId = (await prisma.whatsAppContact.findUnique({ where: { id: contactId }, select: { clientId: true } }))?.clientId ?? null;
  }
  return prisma.quote.findFirst({
    where: { active: true, OR: [{ contactId }, ...(clientId ? [{ clientId }] : [])] },
    orderBy: { createdAt: 'desc' },
    select: { id: true, folio: true, total: true, project: true },
  });
}

/** Retomar conversación: menciona la cotización más reciente del contacto si tiene una. */
export async function sendReengage(contactId: string) {
  const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId }, select: { id: true, phone: true, name: true, clientId: true } });
  if (!contact) throw new Error('Contacto no encontrado.');
  const quote = await latestQuoteForContact(contactId, contact.clientId);
  return sendClientTemplate(contact, 'reengage', [quote ? `tu cotización ${quote.folio}` : 'tu solicitud']);
}
