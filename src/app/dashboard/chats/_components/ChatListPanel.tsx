import { MessageCircle, Plus, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '../_lib/chat-format';
import type { ChatContact, ListFilter } from '../_lib/types';
import { ContactListItem } from './ContactListItem';

const FILTERS: [ListFilter, string][] = [['all', 'Todos'], ['unread', 'No leídos'], ['bot', 'Bot'], ['human', 'Humano'], ['admin', 'Admins']];

type Props = {
  /** En móvil la lista se oculta mientras hay un chat abierto. */
  hasActiveChat: boolean;
  activeContactId: string | null;
  totalContacts: number;
  visibleContacts: ChatContact[];
  unreadCounts: Record<string, number>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  listFilter: ListFilter;
  onFilterChange: (f: ListFilter) => void;
  onOpen: (contact: ChatContact) => void;
  onDelete: (contact: ChatContact) => void;
  onCreateTestContact: () => void;
};

/** Columna izquierda: título, buscador, filtros y la lista de chats. */
export function ChatListPanel({
  hasActiveChat, activeContactId, totalContacts, visibleContacts, unreadCounts,
  searchQuery, onSearchChange, listFilter, onFilterChange, onOpen, onDelete, onCreateTestContact,
}: Props) {
  return (
    <aside className={cn("flex flex-col bg-wa-panel overflow-hidden border-r border-wa-border", hasActiveChat ? "hidden md:flex md:w-[290px] xl:w-[380px] md:shrink-0" : "w-full md:w-[290px] xl:w-[380px] md:shrink-0")}>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-wa-text">Chats</h1>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => window.location.reload()} title="Recargar App" className="p-2 rounded-full text-wa-muted hover:text-wa-text hover:bg-wa-header transition-colors">
            <RefreshCw size={18} />
          </button>
          <button type="button" onClick={onCreateTestContact} title="Crear contacto de prueba" className="p-2 rounded-full text-wa-muted hover:text-wa-text hover:bg-wa-header transition-colors">
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 bg-wa-header rounded-xl px-3 h-10 focus-within:ring-1 focus-within:ring-wa-accent/60 transition-shadow">
          <Search size={16} className="text-wa-muted shrink-0" />
          <input
            placeholder="Buscar por nombre o teléfono"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm !text-wa-text placeholder:text-wa-muted"
          />
          {searchQuery && (
            <button type="button" onClick={() => onSearchChange('')} className="text-wa-muted hover:text-wa-text">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onFilterChange(key)}
            className={cn(
              "shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors",
              listFilter === key ? "bg-wa-accent/20 text-wa-accent-light" : "bg-wa-header text-wa-muted hover:text-wa-text"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {totalContacts === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-wa-muted p-8 text-center space-y-4">
            <MessageCircle size={40} className="opacity-40" />
            <p className="text-sm">No hay chats recientes</p>
            <Button type="button" onClick={onCreateTestContact} className="bg-wa-header hover:bg-wa-input text-wa-text border-none">
              <Plus size={16} className="mr-2" />
              Crear chat de prueba
            </Button>
          </div>
        ) : visibleContacts.length === 0 ? (
          <div className="p-8 text-center text-sm text-wa-muted">Ningún chat coincide con tu búsqueda.</div>
        ) : (
          visibleContacts.map(contact => (
            <ContactListItem
              key={contact.id}
              contact={contact}
              unread={unreadCounts[contact.id] || 0}
              isActive={activeContactId === contact.id}
              onOpen={onOpen}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </aside>
  );
}

/** Lado derecho cuando no hay chat abierto (solo escritorio). */
export function EmptyConversation() {
  return (
    <div className="hidden md:flex flex-1 items-center justify-center bg-wa-chat relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:22px_22px]" />
      <div className="text-center max-w-md p-8 relative z-10 flex flex-col items-center">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-wa-accent/25 to-wa-accent/5 border border-wa-accent/20 flex items-center justify-center mb-6">
          <MessageCircle size={44} className="text-wa-accent-light" />
        </div>
        <h2 className="text-2xl font-semibold text-wa-text mb-2 tracking-tight">Chats de WhatsApp</h2>
        <p className="text-wa-muted leading-relaxed text-sm">Selecciona una conversación de la lista para ver los mensajes y atender a los prospectos de Laser Inova.</p>
      </div>
    </div>
  );
}
