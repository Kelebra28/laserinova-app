import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ChatLayout from './ChatLayout';
import { isAdminPhone, lastInboundByContact } from '@/server/services/whatsapp.service';

export const dynamic = 'force-dynamic';

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  await requireAuth();
  const { c: initialContactId } = await searchParams;

  // Obtener contactos con su último mensaje
  const [contacts, lastInbound] = await Promise.all([
    prisma.whatsAppContact.findMany({
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    }),
    lastInboundByContact(),
  ]);

  // Ordenar: el que tenga el mensaje más reciente va primero (como WhatsApp)
  contacts.sort((a, b) => {
    const aTime = a.messages[0]?.timestamp?.getTime() ?? a.updatedAt.getTime();
    const bTime = b.messages[0]?.timestamp?.getTime() ?? b.updatedAt.getTime();
    return bTime - aTime;
  });

  return (
    <div className="h-full w-full bg-[#111b21]">
      <ChatLayout initialContacts={contacts.map(c => ({ ...c, isAdmin: isAdminPhone(c.phone), lastInboundAt: lastInbound.get(c.id) ?? null }))} initialContactId={initialContactId} />
    </div>
  );
}
