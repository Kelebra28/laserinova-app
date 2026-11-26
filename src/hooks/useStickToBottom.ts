'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CHAT_STICK_THRESHOLD_PX } from '@/constants/chat.constants';

type ScrollMessage = { id: string; direction: string; type: string };

/**
 * Scroll de conversación como en WhatsApp: si estás abajo, el chat sigue a lo nuevo; si subiste a
 * leer, no se mueve y solo cuenta los mensajes del cliente que van llegando.
 */
export function useStickToBottom(chatId: string | null, messages: ScrollMessage[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);

  // El botón de "ir abajo" no debe arrastrarse de la conversación anterior.
  const [shownChatId, setShownChatId] = useState(chatId);
  if (shownChatId !== chatId) {
    setShownChatId(chatId);
    setAtBottom(true);
    setUnseen(0);
  }

  const jump = () => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const scrollToBottom = useCallback(() => {
    stickRef.current = true;
    setAtBottom(true);
    setUnseen(0);
    jump();
  }, []);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight <= CHAT_STICK_THRESHOLD_PX;
    stickRef.current = near;
    setAtBottom(near);
    if (near) setUnseen(0);
  }, []);

  // Cada conversación se abre hasta abajo.
  useLayoutEffect(() => {
    seenIdsRef.current = new Set();
    stickRef.current = true;
    jump();
  }, [chatId]);

  useLayoutEffect(() => {
    const seen = seenIdsRef.current;
    const hadMessages = seen.size > 0;
    const incoming = messages.filter(m => !seen.has(m.id) && m.direction === 'INBOUND' && m.type !== 'REACTION').length;
    seenIdsRef.current = new Set(messages.map(m => m.id));
    if (stickRef.current) jump();
    else if (hadMessages && incoming > 0) setUnseen(n => n + incoming);
  }, [messages]);

  // Fotos que terminan de cargar, teclado del celular o barra de respuesta cambian el alto.
  useEffect(() => {
    const observer = new ResizeObserver(() => { if (stickRef.current) jump(); });
    if (containerRef.current) observer.observe(containerRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [chatId]);

  return { containerRef, contentRef, onScroll, scrollToBottom, atBottom, unseen };
}
