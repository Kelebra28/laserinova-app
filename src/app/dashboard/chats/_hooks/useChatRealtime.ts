'use client';

import { useEffect } from 'react';
import { useWhatsAppEvents } from '@/hooks/useWhatsAppEvents';
import { getPusherClient } from '@/lib/pusher';
import { getContactsAction, getMessagesAction } from '@/server/actions/whatsapp.actions';
import type { ChatContact, ChatMessage } from '../_lib/types';
import type { ChatContactsState } from './useChatContacts';
import type { ConversationState } from './useConversation';

/**
 * Tiempo real del chat: mensajes, reacciones, estados de entrega y cambios de contacto que llegan por Pusher,
 * más una resincronización al volver a la app o al reconectar (en la PWA el websocket se duerme en segundo plano
 * y lo que llegó mientras tanto no se vería hasta recargar).
 */
export function useChatRealtime({ conversation, contacts }: { conversation: ConversationState; contacts: ChatContactsState }) {
  const { activeContactIdRef, setMessages, setActiveContact, patchMessage, appendMessage } = conversation;
  const { setContacts, receiveMessage, addUnread, patchContact } = contacts;

  useWhatsAppEvents({
    onNewMessage: ({ message, contact }: { message: ChatMessage; contact: ChatContact }) => {
      receiveMessage(contact, message);

      if (activeContactIdRef.current === contact.id) {
        // La imagen era muy grande para Pusher: recargar el historial desde la base.
        if (message.mediaUrl === 'FETCH_REQUIRED') conversation.openContact(contact);
        else appendMessage(message);
      } else if (message.direction === 'INBOUND') {
        // Chat cerrado y mensaje del cliente: sube el contador. El sonido lo pone useWhatsAppEvents.
        addUnread(contact.id);
      }
    },
    onReaction: ({ id, reaction }) => {
      patchMessage(m => m.id === id, { reaction });
    },
    onStatusUpdate: (statusData: { id: string; status: string }) => {
      patchMessage(m => m.messageId === statusData.id, { status: statusData.status.toUpperCase() });
    },
    onContactUpdate: ({ contactId, changes }: { contactId: string; changes: Partial<ChatContact> }) => {
      patchContact(contactId, changes);
      setActiveContact(prev => (prev?.id === contactId ? { ...prev, ...changes } : prev));
    },
  });

  useEffect(() => {
    const resync = async () => {
      try {
        const res = await getContactsAction();
        if (res.success) setContacts(res.data as ChatContact[]);
        const activeId = activeContactIdRef.current;
        if (activeId) {
          const msgs = await getMessagesAction(activeId);
          if (msgs.success) setMessages(msgs.data as ChatMessage[]);
        }
      } catch {
        // sin red: se reintenta en el siguiente evento
      }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') resync(); };
    const pusher = getPusherClient();
    const onState = (s: { previous: string; current: string }) => {
      if (s.current === 'connected' && s.previous !== 'connected') resync();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', resync);
    pusher.connection.bind('state_change', onState);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', resync);
      pusher.connection.unbind('state_change', onState);
    };
  }, [activeContactIdRef, setContacts, setMessages]);
}
