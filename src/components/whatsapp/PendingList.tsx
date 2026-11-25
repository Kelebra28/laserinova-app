import Link from 'next/link';
import { MessageCircle, Phone } from 'lucide-react';
import { PENDING_GROUPS, formatAge, formatPhone, type PendingItem } from '@/lib/pending-summary';

/** Lista de pendientes agrupada por urgencia. Solo muestra lo que recibe. */
export default function PendingList({ items, now }: { items: PendingItem[]; now: Date }) {
  if (items.length === 0) {
    return <p className="rounded-xl border border-[#2a3942] bg-[#202c33] px-4 py-6 text-center text-sm text-[#8696a0]">No hay pendientes. Todo contestado.</p>;
  }
  return (
    <div className="space-y-6">
      {PENDING_GROUPS.map((group) => {
        const rows = items.filter((i) => i.kind === group.kind);
        if (rows.length === 0) return null;
        return (
          <section key={group.kind}>
            <h2 className="mb-2 text-sm font-semibold text-[#e9edef]">{group.icon} {group.label} ({rows.length})</h2>
            <ul className="overflow-hidden rounded-xl border border-[#2a3942] bg-[#202c33] divide-y divide-[#2a3942]">
              {rows.map((item) => (
                <li key={item.contactId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#e9edef] truncate">{item.name} <span className="text-xs font-normal text-[#8696a0]">· hace {formatAge(item.since, now)}</span></p>
                    <p className="text-xs text-[#8696a0] truncate">{item.detail}</p>
                  </div>
                  <a href={`https://wa.me/${item.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#8696a0] hover:text-[#e9edef]">
                    <Phone size={13} /> {formatPhone(item.phone)}
                  </a>
                  <Link href={`/dashboard/chats?c=${item.contactId}`} className="flex items-center gap-1.5 rounded-lg bg-[#00a884] px-3 py-1.5 text-xs font-medium text-[#06211b] hover:bg-[#00c298]">
                    <MessageCircle size={13} /> Abrir chat
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
