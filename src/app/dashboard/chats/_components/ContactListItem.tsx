import { memo } from 'react';
import { AlertCircle, AlertTriangle, Bot, CheckCheck, Clock, Trash2, User as UserIcon } from 'lucide-react';
import { windowState, formatDuration, formatDurationShort } from '@/lib/whatsapp-window';
import { cn, listTime, previewOf } from '../_lib/chat-format';
import { ChatAvatar } from './ChatAvatar';
import { useNow } from '../_hooks/useNow';
import { isSimulatorContact, type ChatContact } from '../_lib/types';

type Props = {
  contact: ChatContact;
  unread: number;
  isActive: boolean;
  /** Estables (useStableCallback): reciben el contacto para que el memo no se rompa. */
  onOpen: (contact: ChatContact) => void;
  onDelete: (contact: ChatContact) => void;
};

/**
 * Un chat de la lista: avatar con modo bot/humano, nombre, último mensaje, ventana de 24 h y no leídos.
 * Memorizado: solo se redibuja si cambia su contacto, sus no leídos o si es el activo (o cada minuto, por el reloj).
 */
export const ContactListItem = memo(function ContactListItem({ contact, unread, isActive, onOpen, onDelete }: Props) {
  const now = useNow();
  const last = contact.messages?.[0];
  // Aviso de 24 h solo donde importa: el cliente escribió y nadie le ha contestado,
  // o la ventana está por cerrarse.
  const win = contact.isAdmin || isSimulatorContact(contact) ? null : windowState(contact.lastInboundAt, now);
  const awaitingReply = last?.direction === 'INBOUND';
  const winBadge = !win ? null
    : win.kind === 'open' && (awaitingReply || win.expiring) ? (
      <span
        title={`Ventana de WhatsApp abierta: quedan ${formatDuration(win.remainingMs)} para contestar`}
        className={cn("flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-1.5 h-5",
          win.expiring ? "bg-amber-500/15 text-amber-300" : "bg-wa-accent/15 text-wa-accent-light")}
      >
        <Clock size={11} />{formatDurationShort(win.remainingMs)}
      </span>
    ) : win.kind === 'closed' && awaitingReply ? (
      <span
        title={`Pasaron más de 24 h desde que escribió el cliente (cerró hace ${formatDuration(win.sinceMs)}). WhatsApp no entregará texto libre.`}
        className="flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-1.5 h-5 bg-red-500/15 text-red-300"
      >
        <AlertTriangle size={11} />+24h
      </span>
    ) : null;

  return (
    <div
      onClick={() => onOpen(contact)}
      className={cn(
        "relative px-3 py-2.5 mx-2 my-0.5 rounded-xl cursor-pointer transition-colors flex gap-3 items-center group",
        isActive ? "bg-wa-input" : "hover:bg-wa-row-hover"
      )}
    >
      <div className="relative shrink-0">
        <ChatAvatar contact={contact} size={48} />
        <span
          title={contact.botMode ? 'Bot activo' : 'Atención humana'}
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center ring-2",
            isActive ? "ring-wa-input" : "ring-wa-panel group-hover:ring-wa-row-hover",
            contact.botMode ? "bg-wa-accent text-wa-on-accent" : "bg-wa-chip text-wa-text-alt"
          )}
        >
          {contact.botMode ? <Bot size={11} /> : <UserIcon size={11} />}
        </span>
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex justify-between items-center gap-2">
          <span className={cn("truncate text-[15px]", unread > 0 ? "font-semibold text-white" : "font-medium text-wa-text")}>
            {contact.name || contact.phone}
          </span>
          <span className={cn("text-[11px] shrink-0", unread > 0 ? "text-wa-accent font-medium" : "text-wa-muted")}>
            {last ? listTime(new Date(last.timestamp)) : ''}
          </span>
        </div>
        <div className="flex justify-between items-center gap-2 mt-0.5">
          <span className={cn("text-[13px] truncate flex items-center gap-1", unread > 0 ? "text-wa-text-dim" : "text-wa-muted", last?.direction === 'INTERNAL' && "italic")}>
            {last?.direction === 'OUTBOUND' && (last.status === 'FAILED'
              ? <AlertCircle size={14} className="shrink-0 text-red-400" />
              : <CheckCheck size={14} className={cn("shrink-0", last.status === 'READ' ? "text-wa-read" : "text-wa-muted")} />
            )}
            <span className="truncate">{previewOf(last)}</span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {winBadge}
            {unread > 0 && (
              <span className="bg-wa-accent text-wa-on-accent text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                {unread}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(contact); }}
              title="Eliminar conversación"
              className="hidden group-hover:flex p-1 text-wa-muted hover:text-red-400 hover:bg-wa-border-strong rounded-md transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
