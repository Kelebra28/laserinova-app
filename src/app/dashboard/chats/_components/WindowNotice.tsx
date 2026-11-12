import { AlertTriangle, Clock } from 'lucide-react';
import { formatDuration, windowState, type WindowState } from '@/lib/whatsapp-window';
import { cn } from '../_lib/chat-format';
import { useNow } from '../_hooks/useNow';

/** Aviso del chat abierto, con su propio reloj: el minuto que pasa solo redibuja esta barra. */
export function ActiveWindowNotice({ lastInboundAt }: { lastInboundAt: Date | string | null }) {
  const now = useNow();
  return <WindowNotice state={windowState(lastInboundAt, now)} lastInboundAt={lastInboundAt} />;
}

/** Barra sobre el compositor con el estado de la ventana de 24 h de WhatsApp del chat abierto. */
export function WindowNotice({ state: win, lastInboundAt }: { state: WindowState; lastInboundAt: Date | string | null }) {
  return (
    <div className={cn(
      "z-20 shrink-0 flex items-center gap-2 px-4 py-1.5 text-xs border-t",
      win.kind === 'closed' ? "bg-red-500/10 text-red-300 border-red-500/20"
        : win.kind === 'unknown' ? "bg-wa-header text-wa-muted border-wa-border"
        : win.expiring ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
        : "bg-wa-accent/10 text-wa-accent-light border-wa-accent/20"
    )}>
      {win.kind === 'closed' ? <AlertTriangle size={14} className="shrink-0" /> : <Clock size={14} className="shrink-0" />}
      <span>
        {win.kind === 'closed' ? (
          <>Pasaron más de 24 h desde el último mensaje del cliente ({new Date(lastInboundAt!).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}). WhatsApp <b>no va a entregar</b> texto libre hasta que el cliente vuelva a escribir.</>
        ) : win.kind === 'unknown' ? (
          <>El cliente nunca ha escrito a este número: WhatsApp solo deja mandarle plantillas aprobadas.</>
        ) : (
          <>Ventana de WhatsApp abierta: quedan <b>{formatDuration(win.remainingMs)}</b> para contestar (se cierra {win.closesAt.toLocaleString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}).</>
        )}
      </span>
    </div>
  );
}
