import { memo } from 'react';
import { AlertCircle, Check, CheckCheck, Download, ExternalLink, FileText, Reply, Smile } from 'lucide-react';
import { cn, QUICK_REACTIONS } from '../_lib/chat-format';
import type { ChatMessage } from '../_lib/types';

type Props = {
  msg: ChatMessage;
  /** Del lado derecho (lo que manda el CRM; en el simulador, lo que "escribe el cliente"). */
  alignRight: boolean;
  /** Mismo remitente que el anterior y a menos de 5 min: se pega al anterior y sin "colita". */
  sameAsPrev: boolean;
  reactionMenuOpen: boolean;
  /** Estables (sin depender del mensaje) para que el memo no se rompa. */
  onToggleReactionMenu: (msgId: string) => void;
  onReact: (msgId: string, emoji: string) => void;
  onReply: (msg: ChatMessage) => void;
};

/** Separador de día entre mensajes. */
export function DayChip({ label }: { label: string }) {
  return (
    <div className="flex justify-center my-3">
      <span className="bg-wa-day-chip text-wa-muted text-xs font-medium px-3 py-1 rounded-lg shadow-sm capitalize">{label}</span>
    </div>
  );
}

/**
 * Burbuja de un mensaje del cliente o del CRM: texto, imagen, sticker, audio o documento, con hora, palomitas y reacción.
 * Memorizada: escribir o recibir otro mensaje ya no redibuja las burbujas que no cambiaron.
 */
export const MessageBubble = memo(function MessageBubble({ msg, alignRight, sameAsPrev, reactionMenuOpen, onToggleReactionMenu, onReact, onReply }: Props) {
  const date = new Date(msg.timestamp);
  const isSticker = msg.type === 'IMAGE' && msg.content === '🎭 Sticker';
  const quoted = typeof msg.content === 'string' && msg.type === 'TEXT' ? msg.content.match(/^↪️ En respuesta a «([\s\S]*?)»\n([\s\S]*)$/) : null;
  const bodyText = quoted ? quoted[2] : msg.content;
  const mediaSrc = msg.mediaUrl?.startsWith('http') ? msg.mediaUrl : `/api/media/${msg.id}`;
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const ticks = alignRight && (msg.status === 'FAILED' ? (
    <span className="inline-flex text-red-400" title="WhatsApp no entregó este mensaje (posiblemente pasaron más de 24 h desde que escribió el cliente)">
      <AlertCircle size={15} />
    </span>
  ) : (
    <span className={cn("inline-flex", msg.status === 'READ' ? "text-wa-read" : "text-white/50")}>
      {msg.status === 'SENT' ? <Check size={15} /> : <CheckCheck size={15} />}
    </span>
  ));

  return (
    <div className={cn("flex group items-center", alignRight ? "justify-end" : "justify-start", sameAsPrev ? "mt-0.5" : "mt-2")}>

      {/* Acciones al pasar el mouse (reaccionar / responder) */}
      <div className={cn("hidden group-hover:flex items-center gap-1 mx-2", alignRight ? "order-1" : "order-2")}>
        <button type="button" onClick={() => onToggleReactionMenu(msg.id)} className="p-1.5 rounded-full bg-wa-surface text-wa-muted hover:text-wa-text hover:bg-wa-input transition-colors relative shadow-sm border border-wa-input">
          <Smile size={15} />
          {reactionMenuOpen && (
            <div className="absolute bottom-full mb-2 -translate-x-1/2 left-1/2 bg-wa-menu p-2 rounded-full shadow-xl border border-wa-input flex gap-2 z-50">
              {QUICK_REACTIONS.map(emoji => (
                <div key={emoji} onClick={(e) => { e.stopPropagation(); onReact(msg.id, emoji); }} className="hover:scale-125 cursor-pointer transition-transform text-lg px-1">{emoji}</div>
              ))}
            </div>
          )}
        </button>
        <button type="button" onClick={() => onReply(msg)} className="p-1.5 rounded-full bg-wa-surface text-wa-muted hover:text-wa-text hover:bg-wa-input transition-colors shadow-sm border border-wa-input">
          <Reply size={15} />
        </button>
      </div>

      {isSticker ? (
        <div className={cn("relative", alignRight ? "order-2" : "order-1", msg.reaction && "mb-3")}>
          {/* eslint-disable-next-line @next/next/no-img-element -- media de WhatsApp servida por /api/media */}
          <img src={mediaSrc} alt="Sticker" className="max-w-[160px] max-h-[160px] object-contain drop-shadow-lg" />
          <span className="absolute bottom-1 right-1 text-[10px] text-white/80 bg-black/45 rounded-full px-1.5 py-0.5 flex items-center gap-1">{time}{ticks}</span>
          {msg.reaction && (
            <div className={cn("absolute -bottom-3 bg-wa-menu rounded-full px-1.5 py-0.5 text-sm shadow ring-2 ring-wa-chat z-10", alignRight ? "right-3" : "left-3")}>{msg.reaction}</div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "relative max-w-[85%] md:max-w-[68%] px-2.5 pt-1.5 pb-1 text-[14.5px] leading-[1.4] shadow-[0_1px_1px_rgba(0,0,0,0.3)] rounded-2xl",
            msg.type === 'IMAGE' && "p-1.5",
            alignRight
              ? cn("bg-wa-bubble-out text-wa-text order-2", !sameAsPrev && "rounded-tr-md")
              : cn("bg-wa-surface text-wa-text order-1", !sameAsPrev && "rounded-tl-md"),
            msg.reaction && "mb-3"
          )}
        >
          {quoted && (
            <div className={cn("mb-1.5 rounded-lg border-l-4 px-2.5 py-1.5 text-[13px]", alignRight ? "bg-black/20 border-wa-accent-light" : "bg-black/20 border-wa-accent")}>
              <div className="text-[11px] font-semibold text-wa-accent-light mb-0.5">Respuesta a</div>
              <div className="text-wa-text-dim line-clamp-2">{quoted[1]}</div>
            </div>
          )}

          {msg.type === 'AUDIO' && (
            <div className="mb-1 min-w-[230px]">
              <audio controls src={mediaSrc} className="w-full h-10 filter invert opacity-90" />
            </div>
          )}

          {msg.type === 'IMAGE' ? (
            <div className="flex flex-col gap-1.5 relative w-[min(300px,72vw)]">
              <a href={mediaSrc} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden bg-black/25">
                {/* eslint-disable-next-line @next/next/no-img-element -- media de WhatsApp servida por /api/media */}
                <img src={mediaSrc} alt="Adjunto" className="w-full max-h-80 object-contain" />
              </a>
              <div className="flex gap-1.5">
                <a href={mediaSrc} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors py-1.5 text-[12px] font-medium">
                  <ExternalLink size={14} /> Abrir
                </a>
                <a href={`/api/media/${msg.id}?download=1`} download className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors py-1.5 text-[12px] font-medium">
                  <Download size={14} /> Descargar
                </a>
              </div>
              {msg.content && msg.content !== '📷 Imagen adjunta' && <span className="text-[14px] leading-snug whitespace-pre-wrap break-words px-0.5">{msg.content}</span>}
            </div>
          ) : msg.type === 'DOCUMENT' ? (
            <div className="flex flex-col gap-1.5 min-w-[220px]">
            <a href={mediaSrc} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-black/20 hover:bg-black/30 transition-colors p-2.5 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-300 flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate max-w-[220px]">{msg.content || 'Documento adjunto'}</div>
                <div className="text-[11px] text-white/50">{msg.mimeType === 'application/pdf' ? 'PDF · ' : ''}Toca para abrir</div>
              </div>
            </a>
            <div className="flex gap-1.5">
              <a href={mediaSrc} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors py-1.5 text-[12px] font-medium">
                <ExternalLink size={14} /> Abrir
              </a>
              <a href={`/api/media/${msg.id}?download=1`} download className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors py-1.5 text-[12px] font-medium">
                <Download size={14} /> Descargar
              </a>
            </div>
            </div>
          ) : (
            bodyText ? <p className="break-words whitespace-pre-wrap">{bodyText}<span className={cn("inline-block", alignRight ? "w-[6.2rem]" : "w-[4.6rem]")} /></p> : null
          )}

          <div className={cn("flex items-center justify-end gap-1 text-[11px] text-white/50 select-none", (msg.type === 'TEXT' && bodyText) ? "absolute right-2.5 bottom-1" : "mt-0.5")}>
            <span>{time}</span>
            {ticks}
          </div>

          {msg.aiTrace && <AiTrace raw={msg.aiTrace} />}

          {msg.reaction && (
            <div className={cn("absolute -bottom-3.5 bg-wa-menu rounded-full px-1.5 py-0.5 text-sm shadow ring-2 ring-wa-chat z-10", alignRight ? "right-3" : "left-3")}>
              {msg.reaction}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/** Qué reglas RAG y herramientas usó el bot para esta respuesta. */
function AiTrace({ raw }: { raw: string }) {
  let rules: string[] = [];
  let tools: string[] = [];
  try {
    const t = JSON.parse(raw) as { rules?: string[]; tools?: string[] };
    rules = t.rules ?? [];
    tools = t.tools ?? [];
  } catch {
    return null;
  }
  return (
    <details className="mt-1.5 text-[11px] text-wa-muted border-t border-white/10 pt-1">
      <summary className="cursor-pointer select-none hover:text-wa-text-dim">
        🧠 {rules.length ? `${rules.length} regla(s) RAG` : 'Sin reglas RAG (prompt)'}{tools.length ? ` · ${tools.join(', ')}` : ''}
      </summary>
      <ul className="mt-1 space-y-1 text-left">
        {rules.map((r, i) => <li key={i}>• {r}</li>)}
        {tools.map((n, i) => <li key={`t${i}`}>🔧 Herramienta: {n}</li>)}
        {!rules.length && !tools.length && <li>Respondió solo con el prompt base.</li>}
      </ul>
    </details>
  );
}
