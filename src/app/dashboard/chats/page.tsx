import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ChatLayout from './ChatLayout';

export const dynamic = 'force-dynamic';

export default async function ChatsPage() {
  await requireAuth();

  // Obtener contactos ordenados por la fecha del último mensaje
  const contacts = await prisma.whatsAppContact.findMany({
    include: {
      messages: {
        orderBy: { timestamp: 'desc' },
        take: 1
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  return (
    <div className="h-[calc(100vh-6rem)] w-full flex flex-col bg-[#111b21] text-[#e9edef] overflow-hidden">
      <div className="px-6 py-4 bg-[#202c33] flex justify-between items-center shadow-sm z-10 border-b border-[#313d45]">
        <h1 className="text-xl font-medium text-[#e9edef]">Centro de Mensajes <span className="text-[#00a884] font-semibold">(WhatsApp IA)</span></h1>
      </div>
      <div className="flex-1 overflow-hidden bg-[#111b21]">
        <ChatLayout initialContacts={contacts} />
      </div>
    </div>
  );
}
