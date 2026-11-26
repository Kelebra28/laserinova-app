import { prisma } from '@/lib/prisma';

/**
 * Liga cada aviso de duda enviado por WhatsApp con su cliente, para saber a quién contestar cuando el
 * administrador lo cita. Se guarda como nota INTERNAL en el chat de ese administrador.
 */
const REF_PREFIX = 'doubtref_';
const TITLE = '[AVISO DE DUDA]';

export type DoubtRef = { doubtId: string; clientContactId: string; doubt: string };

export async function saveDoubtRefs(sent: { phone: string; messageId: string }[], ref: DoubtRef): Promise<void> {
  for (const { phone, messageId } of sent) {
    try {
      const admin = await prisma.whatsAppContact.findFirst({ where: { phone: { endsWith: phone.replace(/\D/g, '').slice(-10) } }, select: { id: true } });
      if (!admin) continue;
      await prisma.whatsAppMessage.create({
        data: {
          contactId: admin.id,
          messageId: `${REF_PREFIX}${messageId}`,
          direction: 'INTERNAL',
          type: 'TEXT',
          content: `${TITLE} ${ref.doubtId} ${ref.clientContactId}\n${ref.doubt}`,
          status: 'DELIVERED',
        },
      });
    } catch (e) {
      console.warn('No se pudo ligar el aviso de duda con su cliente:', e);
    }
  }
}

/** El aviso citado, solo si se le mandó a ese administrador. */
export async function findDoubtRef(adminContactId: string, quotedMessageId: string): Promise<DoubtRef | null> {
  const row = await prisma.whatsAppMessage.findUnique({ where: { messageId: `${REF_PREFIX}${quotedMessageId}` }, select: { contactId: true, content: true } });
  if (!row || row.contactId !== adminContactId) return null;
  const [head, ...doubt] = (row.content || '').split('\n');
  const [doubtId, clientContactId] = head.replace(TITLE, '').trim().split(' ');
  return doubtId && clientContactId ? { doubtId, clientContactId, doubt: doubt.join('\n') } : null;
}
