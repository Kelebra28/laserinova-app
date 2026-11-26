import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { notificationEmitter } from '@/lib/notification-emitter';
import { windowState } from '@/lib/whatsapp-window';
import { formatPhone } from '@/lib/pending-summary';
import { addsCommitments, composePrompt, dropsNegation, isAcknowledgment, plainReply } from '@/lib/doubt-reply';
import { sendMessageToMeta, conversationLink } from './whatsapp.service';
import type { DoubtRef } from './doubt-ref.service';

/** Redacta la respuesta; si falla o agrega algo que el equipo no dijo, va el texto del equipo tal cual. */
export async function composeClientReply(doubt: string, answer: string): Promise<string> {
  const plain = plainReply(answer);
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return plain;
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-3.5-flash' });
    const draft = (await model.generateContent(composePrompt(doubt, answer))).response.text().trim();
    const faithful = !!draft && draft.length <= 900 && !addsCommitments(draft, `${doubt}\n${answer}`) && !dropsNegation(draft, answer);
    return faithful ? draft : plain;
  } catch (e) {
    console.warn('No se pudo redactar la respuesta del equipo, va tal cual:', e);
    return plain;
  }
}

/**
 * Manda al cliente la respuesta que el administrador escribió citando el aviso de su duda.
 * Devuelve lo que hay que contestarle al administrador. No cambia si el bot está prendido en ese chat.
 */
export async function relayDoubtAnswer(admin: { id: string; name: string | null }, ref: DoubtRef, answer: string): Promise<string> {
  const client = await prisma.whatsAppContact.findUnique({ where: { id: ref.clientContactId } });
  if (!client) return 'No encontré el chat de ese cliente. No mandé nada.';
  const who = `${client.name || 'el cliente'} (${formatPhone(client.phone)})`;

  if (!answer || isAcknowledgment(answer)) {
    return `No le mandé nada a ${who}. Para contestarle, cita el aviso y escribe la respuesta completa.`;
  }

  const lastInbound = await prisma.whatsAppMessage.findFirst({
    where: { contactId: client.id, direction: 'INBOUND', type: { not: 'REACTION' } },
    orderBy: { timestamp: 'desc' },
    select: { timestamp: true },
  });
  if (windowState(lastInbound?.timestamp).kind !== 'open') {
    return `⚠️ No se envió: ${who} lleva más de 24 h sin escribir y WhatsApp no deja mandarle texto libre.\nChat: ${conversationLink(client.id)}`;
  }

  // El id único aparta la duda: si dos administradores contestan a la vez, solo sale una respuesta.
  const lockId = `doubtdone_${ref.doubtId}`;
  try {
    await prisma.whatsAppMessage.create({
      data: { contactId: admin.id, messageId: lockId, direction: 'INTERNAL', type: 'TEXT', content: `[DUDA CONTESTADA] ${answer}`, status: 'DELIVERED' },
    });
  } catch (e) {
    const previous = await prisma.whatsAppMessage.findUnique({ where: { messageId: lockId }, select: { content: true } });
    if (!previous) throw e;
    return `Esa duda ya se contestó: «${(previous.content || '').replace('[DUDA CONTESTADA] ', '').slice(0, 200)}». No mandé nada.\nPara agregar algo: ${conversationLink(client.id)}`;
  }

  const text = await composeClientReply(ref.doubt, answer);
  let messageId: string;
  try {
    const res = await sendMessageToMeta(client.phone, { type: 'text', text: { body: text } });
    messageId = res?.messages?.[0]?.id;
    if (!messageId) throw new Error('WhatsApp no confirmó el envío');
  } catch (e) {
    await prisma.whatsAppMessage.delete({ where: { messageId: lockId } }).catch(() => {});
    return `⚠️ No se pudo enviar a ${who}: ${e instanceof Error ? e.message : 'error desconocido'}. Puedes citar el aviso otra vez.`;
  }

  // La nota va antes del mensaje para que el bot siga la conversación sabiendo que la duda ya se resolvió.
  await prisma.whatsAppMessage.create({
    data: {
      contactId: client.id,
      messageId: `duda_resuelta_${ref.doubtId}`,
      direction: 'INTERNAL',
      type: 'TEXT',
      content: `[NOTA INTERNA DEL SISTEMA]: El equipo contestó la duda «${ref.doubt}»: «${answer}». Ya se le envió al cliente en el siguiente mensaje. Sigue la conversación tomando en cuenta esa respuesta, sin agregar condiciones que el equipo no dio.`,
      status: 'DELIVERED',
    },
  });
  // Sin aiTrace: cuenta como respuesta del equipo (deja de salir en pendientes).
  const saved = await prisma.whatsAppMessage.create({
    data: { contactId: client.id, messageId, direction: 'OUTBOUND', type: 'TEXT', content: text, status: 'SENT', timestamp: new Date(Date.now() + 1) },
  });
  await notificationEmitter.emit('whatsapp_message', { message: saved, contact: client }).catch(() => {});

  return [
    `✅ Le mandé a ${who}:`,
    `«${text}»`,
    '',
    client.botMode ? 'El bot sigue atendiendo ese chat.' : `El bot está apagado en ese chat; sigue desde el CRM: ${conversationLink(client.id)}`,
  ].join('\n');
}
