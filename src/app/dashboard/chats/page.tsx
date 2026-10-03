import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ChatLayout from './ChatLayout';

export const dynamic = 'force-dynamic';

export default async function ChatsPage() {
  await requireAuth();

  // Obtener contactos con su último mensaje
  const contacts = await prisma.whatsAppContact.findMany({
    include: {
      messages: {
        orderBy: { timestamp: 'desc' },
        take: 1
      }
    }
  });

  // Ordenar: el que tenga el mensaje más reciente va primero (como WhatsApp)
  contacts.sort((a, b) => {
    const aTime = a.messages[0]?.timestamp?.getTime() ?? a.updatedAt.getTime();
    const bTime = b.messages[0]?.timestamp?.getTime() ?? b.updatedAt.getTime();
    return bTime - aTime;
  });

  return (
    <div className="h-full w-full bg-[#111b21]">
      <ChatLayout initialContacts={contacts} />
    </div>
  );
}
