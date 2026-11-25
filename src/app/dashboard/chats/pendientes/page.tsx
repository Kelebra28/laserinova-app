import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import PendingList from '@/components/whatsapp/PendingList';
import { getPendingItems } from '@/server/services/pending-summary.service';

export const dynamic = 'force-dynamic';

export default async function PendingChatsPage() {
  await requireAuth();
  const items = await getPendingItems();
  return (
    <div className="min-h-full bg-[#111b21] p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-[#e9edef]">Pendientes por contestar ({items.length})</h1>
          <Link href="/dashboard/chats" className="text-sm text-[#8696a0] hover:text-[#e9edef]">Ir a chats</Link>
        </div>
        <PendingList items={items} now={new Date()} />
      </div>
    </div>
  );
}
