'use client';

import { useCallback, useState, type RefObject } from 'react';
import { Loader2 } from 'lucide-react';
import { dayLabel } from '../_lib/chat-format';
import type { ChatMessage } from '../_lib/types';
import { DayChip, MessageBubble } from './MessageBubble';
import { InternalNoteBubble } from './InternalNoteBubble';

type Props = {
  messages: ChatMessage[];
  loading: boolean;
  simulatorMode: boolean;
  endRef: RefObject<HTMLDivElement | null>;
  /** Reacción elegida en el menú de una burbuja (solo se ve en el CRM). */
  onReact: (msgId: string, emoji: string) => void;
  onReply: (msg: ChatMessage) => void;
};

/** Historial del chat abierto con separadores de día, notas internas y burbujas. */
export function MessageList({ messages, loading, simulatorMode, endRef, onReact, onReply }: Props) {
  // Qué burbuja tiene abierto su menú de reacciones (estado local: no redibuja el resto de la pantalla).
  const [reactionMenuFor, setReactionMenuFor] = useState<string | null>(null);
  const toggleReactionMenu = useCallback((msgId: string) => setReactionMenuFor(cur => (cur === msgId ? null : msgId)), []);
  const react = useCallback((msgId: string, emoji: string) => {
    onReact(msgId, emoji);
    setReactionMenuFor(null);
  }, [onReact]);

  return (
    <div className="flex-1 overflow-y-auto px-3 md:px-[6%] py-4 z-10 relative">
      {loading ? (
        <div className="flex items-center justify-center gap-2 text-wa-muted my-8 text-sm">
          <Loader2 size={16} className="animate-spin" /> Cargando mensajes...
        </div>
      ) : (
        messages.map((msg, idx) => {
          const prev = messages[idx - 1];
          const date = new Date(msg.timestamp);
          const showDay = !prev || new Date(prev.timestamp).toDateString() !== date.toDateString();
          const dayChip = showDay && <DayChip label={dayLabel(date)} />;

          if (msg.direction === 'INTERNAL') {
            return (
              <div key={msg.id}>
                {dayChip}
                <InternalNoteBubble content={msg.content} />
              </div>
            );
          }

          // Las reacciones se muestran pegadas al mensaje, nunca como aviso aparte
          if (msg.type === 'REACTION') return null;

          // En el simulador tú escribes como el cliente: sus mensajes van a la derecha.
          const alignRight = simulatorMode ? msg.direction === 'INBOUND' : msg.direction === 'OUTBOUND';
          const sameAsPrev = !!prev && !showDay && prev.direction === msg.direction && prev.direction !== 'INTERNAL' && prev.type !== 'REACTION'
            && date.getTime() - new Date(prev.timestamp).getTime() < 5 * 60 * 1000;

          return (
            <div key={msg.id}>
              {dayChip}
              <MessageBubble
                msg={msg}
                alignRight={alignRight}
                sameAsPrev={sameAsPrev}
                reactionMenuOpen={reactionMenuFor === msg.id}
                onToggleReactionMenu={toggleReactionMenu}
                onReact={react}
                onReply={onReply}
              />
            </div>
          );
        })
      )}
      <div ref={endRef} />
    </div>
  );
}
