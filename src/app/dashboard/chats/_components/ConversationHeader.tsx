import Link from 'next/link';
import { Bot, Calculator, ChevronLeft, Loader2, RefreshCw, Sparkles, Trash2, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '../_lib/chat-format';
import { ChatAvatar } from './ChatAvatar';
import type { ChatContact } from '../_lib/types';

type Props = {
  contact: ChatContact;
  simulatorMode: boolean;
  /** Link a "Nueva cotización" con el último borrador del bot, si hay. */
  pendingQuoteUrl: string;
  retryingBot: boolean;
  onBack: () => void;
  onCalculate: () => void;
  onToggleSimulator: () => void;
  onToggleBot: () => void;
  onRetryBot: () => void;
  onSummary: () => void;
  onDelete: () => void;
};

/** Cabecera del chat abierto: contacto, modo bot/humano y acciones (cotizar, simulador, resumen, borrar). */
export function ConversationHeader({
  contact, simulatorMode, pendingQuoteUrl, retryingBot,
  onBack, onCalculate, onToggleSimulator, onToggleBot, onRetryBot, onSummary, onDelete,
}: Props) {
  return (
    <header className="h-16 bg-wa-panel/95 backdrop-blur border-b border-wa-border px-3 md:px-5 flex items-center justify-between shrink-0 z-30">
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 pr-2">
        <button
          type="button"
          onClick={onBack}
          className="md:hidden p-2 -ml-2 text-wa-muted hover:text-wa-text rounded-full hover:bg-wa-header"
          aria-label="Volver a la lista"
        >
          <ChevronLeft size={24} />
        </button>
        <ChatAvatar contact={contact} size={40} />
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-[16px] text-wa-text leading-tight truncate">{contact.name || contact.phone}</span>
          <span className="text-xs text-wa-muted truncate flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", contact.botMode ? "bg-wa-accent" : "bg-amber-400")} />
            {contact.botMode ? 'Bot activo' : 'Atención humana'} · +{contact.phone}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {pendingQuoteUrl && (
          <Link href={pendingQuoteUrl}>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full px-3.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95"
              title="Cotización Lista para Generar"
            >
              📝 <span className="hidden xl:inline">Generar cotización</span>
            </Button>
          </Link>
        )}

        {!contact.isAdmin && (
          <button
            type="button"
            onClick={onCalculate}
            className="h-9 rounded-full px-3 flex items-center gap-1.5 text-xs font-semibold bg-wa-header text-amber-300 hover:bg-wa-input transition-colors active:scale-95"
            title="Calcular cotización con los datos de esta conversación"
          >
            <Calculator size={16} /><span className="hidden xl:inline">Calcular</span>
          </button>
        )}

        <div title="Modo simulador" className="hidden md:flex items-center gap-2 bg-wa-header 2xl:pl-3 pl-2 pr-2 py-1 rounded-full">
          <span className="text-[11px] font-medium text-wa-muted hidden 2xl:inline">Simulador</span>
          <button
            type="button"
            onClick={onToggleSimulator}
            aria-label="Activar modo simulador"
            className={cn("w-9 h-5 rounded-full relative transition-colors duration-300", simulatorMode ? "bg-amber-500" : "bg-wa-chip")}
          >
            <div className={cn("w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform duration-300 shadow", simulatorMode ? "translate-x-[18px]" : "translate-x-[3px]")} />
          </button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleBot}
          className={cn(
            "rounded-full px-3.5 font-semibold text-xs transition-all active:scale-95",
            contact.botMode
              ? "bg-wa-accent hover:bg-wa-accent-hover text-wa-on-accent"
              : "bg-wa-header hover:bg-wa-input text-wa-text-dim"
          )}
          title={contact.botMode ? 'Pasar a atención humana' : 'Reactivar el bot'}
        >
          {contact.botMode
            ? <><Bot size={15} className="xl:mr-1.5" /><span className="hidden xl:inline">Bot activo</span></>
            : <><UserIcon size={15} className="xl:mr-1.5" /><span className="hidden xl:inline">Modo humano</span></>}
        </Button>

        {contact.botMode && (
          <button
            type="button"
            onClick={onRetryBot}
            disabled={retryingBot}
            className="w-9 h-9 rounded-full flex items-center justify-center text-wa-accent hover:bg-wa-accent/15 transition-colors active:scale-95 disabled:opacity-50"
            title="Reintentar bot: contesta el último mensaje del cliente si se quedó sin respuesta"
          >
            {retryingBot ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          </button>
        )}

        <button
          type="button"
          onClick={onSummary}
          className="w-9 h-9 rounded-full flex items-center justify-center text-purple-300 hover:bg-purple-500/15 transition-colors active:scale-95"
          title="Resumir con IA"
        >
          <Sparkles size={18} />
        </button>

        <button
          type="button"
          data-testid="delete-chat-header-btn"
          onClick={onDelete}
          className="w-9 h-9 rounded-full flex items-center justify-center text-wa-muted hover:text-red-400 hover:bg-red-500/10 transition-colors active:scale-95"
          title="Eliminar conversación completa"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </header>
  );
}
