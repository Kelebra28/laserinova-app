import { requireAuth } from '@/lib/auth';
import ChatLayout from './ChatLayout';
import { listChatContacts, listChatMessages } from '@/server/services/whatsapp.service';

export const dynamic = 'force-dynamic';

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  await requireAuth();
  const { c: initialContactId } = await searchParams;

  // Si viene del link de una notificación (?c=<id>), el historial de ese chat se carga aquí mismo,
  // en paralelo con la lista: la conversación aparece abierta desde el primer pintado.
  const [contacts, initialMessages] = await Promise.all([
    listChatContacts(),
    initialContactId ? listChatMessages(initialContactId) : Promise.resolve(null),
  ]);

  return (
    <div className="h-full w-full bg-wa-panel">
      <ChatLayout initialContacts={contacts} initialContactId={initialContactId} initialMessages={initialMessages} />
    </div>
  );
}
