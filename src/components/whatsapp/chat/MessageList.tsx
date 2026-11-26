'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Bot, Smile, Reply, FileText, Check, CheckCheck, X, Clock, AlertCircle, Download, ExternalLink } from 'lucide-react';
import { resolveQuoteSuggestionAction } from '@/server/actions/whatsapp-notify.actions';
import { CHAT_REACTIONS } from '@/constants/chat.constants';
import { chatDayLabel } from '@/constants/formatters.constants';
import { cn } from '@/lib/cn';
import { mediaSrcOf, downloadHrefOf } from '@/lib/chat-media';

type Message = any;

type MessageListProps = {
  messages: Message[];
  contactId: string;
  simulatorMode: boolean;
  onOpenImage: (messageId: string) => void;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onContentChange: (messageId: string, content: string) => void;
};

/** Memoizada: escribir en la caja de texto no vuelve a dibujar toda la conversación. */
function MessageList({ messages, contactId, simulatorMode, onOpenImage, onReply, onReact, onContentChange }: MessageListProps) {
  const [reactionMenuFor, setReactionMenuFor] = useState<string | null>(null);

  return (
    <>
      {messages.map((msg, idx) => {
      const prev = messages[idx - 1];
      const date = new Date(msg.timestamp);
      const showDay = !prev || new Date(prev.timestamp).toDateString() !== date.toDateString();
      const dayChip = showDay && (
        <div className="flex justify-center my-3">
          <span className="bg-[#182229] text-[#8696a0] text-xs font-medium px-3 py-1 rounded-lg shadow-sm capitalize">{chatDayLabel(date)}</span>
        </div>
      );

      const isInternal = msg.direction === 'INTERNAL';
      const isSimulatorChat = simulatorMode;
      const alignRight = isInternal ? false : isSimulatorChat ? (msg.direction === 'INBOUND') : (msg.direction === 'OUTBOUND');

      if (isInternal) {
        const parts = msg.content?.split('|||') || [];
        const displayContent = parts[0];
        let buttonLink = null;
        let buttonText = "";

        const suggestion = parts[1]?.startsWith('SUGGEST:') ? parts[1] : null;
        const suggestionDone = parts[1]?.startsWith('SUGGEST_DONE:') ? parts[1].replace('SUGGEST_DONE:', '') : null;

        if (parts[1] && !suggestion && !suggestionDone) {
          if (parts[1].startsWith('QUOTE:')) {
            const quoteId = parts[1].replace('QUOTE:', '');
            buttonLink = `/dashboard/quotes/${quoteId}`;
            buttonText = "Ver Cotización";
          } else {
            try {
              const data = JSON.parse(decodeURIComponent(parts[1]));
              let queryParams = `?contactId=${contactId}`;
              if (data.project) queryParams += `&project=${encodeURIComponent(data.project)}`;
              if (data.material) queryParams += `&material=${encodeURIComponent(data.material)}`;
              if (data.width) queryParams += `&w=${data.width}`;
              if (data.height) queryParams += `&h=${data.height}`;
              if (data.qty) queryParams += `&qty=${data.qty}`;
              if (data.estimatedTimeMin) queryParams += `&t=${data.estimatedTimeMin}`;
              if (data.name) queryParams += `&name=${encodeURIComponent(data.name)}`;
              if (data.email) queryParams += `&email=${encodeURIComponent(data.email)}`;
              if (data.type) queryParams += `&type=${encodeURIComponent(data.type)}`;
              if (data.description) queryParams += `&desc=${encodeURIComponent(data.description)}`;
              if (data.productId) queryParams += `&productId=${encodeURIComponent(data.productId)}`;
              queryParams += `&msgId=${msg.id}`;
              buttonLink = `/dashboard/quotes/new${queryParams}`;
              buttonText = "Generar Cotización";
            } catch(e) {}
          }
        }

        return (
          <div key={msg.id}>
            {dayChip}
            <div className="flex justify-center w-full my-2">
              <div className="bg-amber-400/[0.07] border border-amber-400/20 text-amber-100/90 px-4 py-2.5 rounded-xl text-[13px] max-w-[90%] md:max-w-[75%] shadow-sm">
                <div className="font-semibold mb-1 flex items-center gap-1.5 text-amber-300 text-xs uppercase tracking-wide">
                  <Bot size={13} /> Nota interna · Sistema
                </div>
                <p className="whitespace-pre-wrap text-left break-words">{displayContent}</p>
                {suggestion && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        const r = await resolveQuoteSuggestionAction(msg.id, 'CONFIRM');
                        if (r.success) { onContentChange(msg.id, r.content!); toast.success(r.outcome!); }
                        else toast.error(r.error);
                      }}
                      className="inline-flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                    >
                      <Check size={14} /> {suggestion.startsWith('SUGGEST:ACCEPT') ? 'Confirmar aceptada' : 'Confirmar rechazada'}
                    </button>
                    <button
                      onClick={async () => {
                        const r = await resolveQuoteSuggestionAction(msg.id, 'DISMISS');
                        if (r.success) onContentChange(msg.id, r.content!);
                        else toast.error(r.error);
                      }}
                      className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-amber-100/80 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                    >
                      <X size={14} /> Ignorar
                    </button>
                  </div>
                )}
                {suggestionDone && <p className="mt-1.5 text-xs font-semibold text-amber-300/90">✔ {suggestionDone}</p>}
                {buttonLink && buttonText !== "Generar Cotización" && (
                  <Link
                    href={buttonLink}
                    className="mt-2 inline-flex items-center gap-1.5 bg-amber-400/15 hover:bg-amber-400/25 text-amber-200 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                  >
                    <FileText size={14} /> {buttonText}
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Las reacciones se muestran pegadas al mensaje, nunca como aviso aparte
      if (msg.type === 'REACTION') return null;

      const sameAsPrev = !!prev && !showDay && prev.direction === msg.direction && prev.direction !== 'INTERNAL' && prev.type !== 'REACTION'
        && date.getTime() - new Date(prev.timestamp).getTime() < 5 * 60 * 1000;
      const isSticker = msg.type === 'IMAGE' && msg.content === '🎭 Sticker';
      const quoted = typeof msg.content === 'string' && msg.type === 'TEXT' ? msg.content.match(/^↪️ En respuesta a «([\s\S]*?)»\n([\s\S]*)$/) : null;
      const bodyText = quoted ? quoted[2] : msg.content;
      const sending = msg.status === 'SENDING';
      const mediaSrc = mediaSrcOf(msg);
      const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const ticks = alignRight && (sending ? (
        <span className="inline-flex text-white/50" title="Enviando"><Clock size={13} /></span>
      ) : msg.status === 'FAILED' ? (
        <span className="inline-flex text-red-400" title="WhatsApp no entregó este mensaje (posiblemente pasaron más de 24 h desde que escribió el cliente)">
          <AlertCircle size={15} />
        </span>
      ) : (
        <span className={cn("inline-flex", msg.status === 'READ' ? "text-[#53bdeb]" : "text-white/50")}>
          {msg.status === 'SENT' ? <Check size={15} /> : <CheckCheck size={15} />}
        </span>
      ));

      return (
        <div key={msg.id}>
          {dayChip}
          <div className={cn("flex group items-center", alignRight ? "justify-end" : "justify-start", sameAsPrev ? "mt-0.5" : "mt-2")}>

            {/* Acciones al pasar el mouse (reaccionar / responder) */}
            <div className={cn("hidden items-center gap-1 mx-2", !sending && "group-hover:flex", alignRight ? "order-1" : "order-2")}>
              <button type="button" onClick={() => setReactionMenuFor(reactionMenuFor === msg.id ? null : msg.id)} className="p-1.5 rounded-full bg-[#1f2c34] text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition-colors relative shadow-sm border border-[#2a3942]">
                <Smile size={15} />
                {reactionMenuFor === msg.id && (
                  <div className="absolute bottom-full mb-2 -translate-x-1/2 left-1/2 bg-[#233138] p-2 rounded-full shadow-xl border border-[#2a3942] flex gap-2 z-50">
                    {CHAT_REACTIONS.map(emoji => (
                      <div key={emoji} onClick={(e) => { e.stopPropagation(); onReact(msg.id, emoji); setReactionMenuFor(null); }} className="hover:scale-125 cursor-pointer transition-transform text-lg px-1">{emoji}</div>
                    ))}
                  </div>
                )}
              </button>
              <button type="button" onClick={() => onReply(msg)} className="p-1.5 rounded-full bg-[#1f2c34] text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition-colors shadow-sm border border-[#2a3942]">
                <Reply size={15} />
              </button>
            </div>

            {isSticker ? (
              <div className={cn("relative", alignRight ? "order-2" : "order-1", msg.reaction && "mb-3")}>
                <img src={mediaSrc} alt="Sticker" loading="lazy" decoding="async" className="w-40 h-40 object-contain drop-shadow-lg" />
                <span className="absolute bottom-1 right-1 text-[10px] text-white/80 bg-black/45 rounded-full px-1.5 py-0.5 flex items-center gap-1">{time}{ticks}</span>
                {msg.reaction && (
                  <div className={cn("absolute -bottom-3 bg-[#233138] rounded-full px-1.5 py-0.5 text-sm shadow ring-2 ring-[#0b141a] z-10", alignRight ? "right-3" : "left-3")}>{msg.reaction}</div>
                )}
              </div>
            ) : (
              <div
                className={cn(
                  "relative max-w-[85%] md:max-w-[68%] px-2.5 pt-1.5 pb-1 text-[14.5px] leading-[1.4] shadow-[0_1px_1px_rgba(0,0,0,0.3)] rounded-2xl",
                  msg.type === 'IMAGE' && "p-1.5",
                  alignRight
                    ? cn("bg-[#005c4b] text-[#e9edef] order-2", !sameAsPrev && "rounded-tr-md")
                    : cn("bg-[#1f2c34] text-[#e9edef] order-1", !sameAsPrev && "rounded-tl-md"),
                  msg.reaction && "mb-3"
                )}
              >
                {quoted && (
                  <div className={cn("mb-1.5 rounded-lg border-l-4 px-2.5 py-1.5 text-[13px]", alignRight ? "bg-black/20 border-[#35d6b5]" : "bg-black/20 border-[#00a884]")}>
                    <div className="text-[11px] font-semibold text-[#35d6b5] mb-0.5">Respuesta a</div>
                    <div className="text-[#c7d0d5] line-clamp-2">{quoted[1]}</div>
                  </div>
                )}

                {msg.type === 'AUDIO' && (
                  <div className="mb-1 min-w-[230px]">
                    <audio controls preload="metadata" src={mediaSrc} className="w-full h-10 filter invert opacity-90" />
                  </div>
                )}

                {msg.type === 'VIDEO' && (
                  <div className="flex flex-col gap-1.5 w-[min(300px,72vw)]">
                    <video controls preload="metadata" src={mediaSrc} className="w-full h-56 rounded-xl bg-black/25" />
                    <a href={downloadHrefOf(msg)} download className="flex items-center justify-center gap-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors py-1.5 text-[12px] font-medium">
                      <Download size={14} /> Descargar
                    </a>
                    {msg.content && msg.content !== '🎬 Video' && <span className="text-[14px] leading-snug whitespace-pre-wrap break-words px-0.5">{msg.content}</span>}
                  </div>
                )}

                {msg.type === 'IMAGE' ? (
                  <div className="flex flex-col gap-1.5 relative w-[min(300px,72vw)]">
                    <button type="button" onClick={() => onOpenImage(msg.id)} className="block w-full rounded-xl overflow-hidden bg-black/25 cursor-zoom-in">
                      <img src={mediaSrc} alt="Adjunto" loading="lazy" decoding="async" className="w-full h-72 object-contain" />
                    </button>
                    <div className={cn("flex gap-1.5", sending && "invisible")}>
                      <button type="button" onClick={() => onOpenImage(msg.id)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors py-1.5 text-[12px] font-medium">
                        <ExternalLink size={14} /> Abrir
                      </button>
                      <a href={downloadHrefOf(msg)} download className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors py-1.5 text-[12px] font-medium">
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
                    <a href={downloadHrefOf(msg)} download className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors py-1.5 text-[12px] font-medium">
                      <Download size={14} /> Descargar
                    </a>
                  </div>
                  </div>
                ) : msg.type === 'VIDEO' ? null : (
                  bodyText ? <p className="break-words whitespace-pre-wrap">{bodyText}<span className={cn("inline-block", alignRight ? "w-[6.2rem]" : "w-[4.6rem]")} /></p> : null
                )}

                <div className={cn("flex items-center justify-end gap-1 text-[11px] text-white/50 select-none", (msg.type === 'TEXT' && bodyText) ? "absolute right-2.5 bottom-1" : "mt-0.5")}>
                  <span>{time}</span>
                  {ticks}
                </div>

                {msg.aiTrace && (() => {
                  try {
                    const t = JSON.parse(msg.aiTrace) as { rules?: string[]; tools?: string[] };
                    const rules = t.rules ?? [];
                    const tools = t.tools ?? [];
                    return (
                      <details className="mt-1.5 text-[11px] text-[#8696a0] border-t border-white/10 pt-1">
                        <summary className="cursor-pointer select-none hover:text-[#c7d0d5]">
                          🧠 {rules.length ? `${rules.length} regla(s) RAG` : 'Sin reglas RAG (prompt)'}{tools.length ? ` · ${tools.join(', ')}` : ''}
                        </summary>
                        <ul className="mt-1 space-y-1 text-left">
                          {rules.map((r, i) => <li key={i}>• {r}</li>)}
                          {tools.map((n, i) => <li key={`t${i}`}>🔧 Herramienta: {n}</li>)}
                          {!rules.length && !tools.length && <li>Respondió solo con el prompt base.</li>}
                        </ul>
                      </details>
                    );
                  } catch { return null; }
                })()}

                {msg.reaction && (
                  <div className={cn("absolute -bottom-3.5 bg-[#233138] rounded-full px-1.5 py-0.5 text-sm shadow ring-2 ring-[#0b141a] z-10", alignRight ? "right-3" : "left-3")}>
                    {msg.reaction}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
      })}
    </>
  );
}

export default memo(MessageList);
