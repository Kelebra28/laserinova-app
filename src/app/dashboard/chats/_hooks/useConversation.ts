'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getMessagesAction } from '@/server/actions/whatsapp.actions';
import { buildNewQuoteUrl, parseInternalMessage } from '@/lib/whatsapp/internal-message';
import { isSimulatorContact, type ChatContact, type ChatMessage } from '../_lib/types';

type Options = {
  /** Chat abierto desde el link de una notificación, con su historial ya cargado en el servidor. */
  preloadedContact: ChatContact | null;
  preloadedMessages: ChatMessage[] | null;
  /** Chat del link (?c=<id>) cuyo historial no vino del servidor: se abre al entrar. */
  linkTarget: ChatContact | null;
  /** Al abrir un chat (para limpiar sus no leídos). */
  onOpen: (contactId: string) => void;
};

/** La conversación abierta: contacto, mensajes, carga, simulador y scroll al final. */
export function useConversation({ preloadedContact, preloadedMessages, linkTarget, onOpen }: Options) {
  const [activeContact, setActiveContact] = useState<ChatContact | null>(preloadedContact);
  const [messages, setMessages] = useState<ChatMessage[]>(preloadedContact && preloadedMessages ? preloadedMessages : []);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [simulatorMode, setSimulatorMode] = useState(isSimulatorContact(preloadedContact));

  // Id del chat abierto para handlers asíncronos (resync, modales, respuestas tardías).
  const activeContactIdRef = useRef<string | null>(preloadedContact?.id ?? null);
  useEffect(() => {
    activeContactIdRef.current = activeContact?.id ?? null;
  }, [activeContact]);

  // Último chat que se pidió abrir: si tocas A y luego B con la red lenta, la respuesta de A
  // puede llegar después y no debe pintar sus mensajes bajo la cabecera de B.
  const requestedContactIdRef = useRef<string | null>(null);

  // Al abrir un chat se salta directo al final; la animación suave queda para los mensajes nuevos.
  const jumpToBottomRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const openContact = async (contact: ChatContact) => {
    requestedContactIdRef.current = contact.id;
    if (contact.id !== activeContactIdRef.current) jumpToBottomRef.current = true;
    activeContactIdRef.current = contact.id;
    setActiveContact(contact);
    setLoadingMessages(true);
    onOpen(contact.id);
    // El contacto de prueba abre en modo simulador
    setSimulatorMode(isSimulatorContact(contact));

    try {
      const result = await getMessagesAction(contact.id);
      if (requestedContactIdRef.current !== contact.id) return; // ya se abrió otro chat
      if (result.success) setMessages(result.data as ChatMessage[]);
    } catch {
      if (requestedContactIdRef.current !== contact.id) return;
      toast.error('Error al cargar mensajes');
    }
    setLoadingMessages(false);
  };

  const close = () => setActiveContact(null);

  // Enlace directo (/dashboard/chats?c=<id>) sin historial precargado: abrir esa conversación al entrar.
  const openedLinkRef = useRef(false);
  useEffect(() => {
    if (openedLinkRef.current || !linkTarget) return;
    openedLinkRef.current = true;
    openContact(linkTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo una vez al montar
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    messagesEndRef.current?.scrollIntoView({ behavior: jumpToBottomRef.current ? 'auto' : 'smooth' });
    jumpToBottomRef.current = false;
  }, [messages]);

  /** Agrega un mensaje si no estaba (Pusher y la respuesta del envío pueden traer el mismo). */
  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => (prev.some(m => m.id === message.id) ? prev : [...prev, message]));
  }, []);

  /** Cambia el mensaje optimista por el real que devolvió el servidor. */
  const replaceMessage = useCallback((tempId: string, message: ChatMessage) => {
    setMessages(prev => {
      const filtered = prev.filter(m => m.id !== tempId);
      return filtered.some(m => m.id === message.id) ? filtered : [...filtered, message];
    });
  }, []);

  const removeMessage = useCallback((id: string) => setMessages(prev => prev.filter(m => m.id !== id)), []);

  const patchMessage = useCallback((match: (m: ChatMessage) => boolean, changes: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(m => (match(m) ? { ...m, ...changes } : m)));
  }, []);

  // Último borrador del bot en la conversación: habilita "Generar cotización" en la cabecera.
  const pendingQuoteUrl = useMemo(() => {
    if (!activeContact || messages.length === 0) return '';
    const quoteMsg = [...messages].reverse().find(m => m.direction === 'INTERNAL' && m.content?.includes('|||'));
    const link = quoteMsg ? parseInternalMessage(quoteMsg.content).link : null;
    return link?.kind === 'draft' ? buildNewQuoteUrl(activeContact.id, link.data) : '';
  }, [activeContact, messages]);

  // Ventana de 24 h del chat abierto: se toma de los mensajes cargados (lo más fresco) y si no, de la lista.
  const activeLastInbound = useMemo(() => {
    if (!activeContact) return null;
    const fromMsgs = [...messages].reverse().find(m => m.direction === 'INBOUND' && m.type !== 'REACTION')?.timestamp;
    return fromMsgs ?? activeContact.lastInboundAt ?? null;
  }, [activeContact, messages]);

  return {
    activeContact, setActiveContact, messages, setMessages, loadingMessages,
    simulatorMode, setSimulatorMode, activeContactIdRef, messagesEndRef,
    openContact, close, appendMessage, replaceMessage, removeMessage, patchMessage,
    pendingQuoteUrl, activeLastInbound,
  };
}

export type ConversationState = ReturnType<typeof useConversation>;
