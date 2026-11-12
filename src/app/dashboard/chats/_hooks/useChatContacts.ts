'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ChatContact, ChatMessage, ListFilter } from '../_lib/types';

/** Lista de chats: contactos, no leídos, búsqueda y filtro. Todas las acciones tienen identidad fija. */
export function useChatContacts(initialContacts: ChatContact[]) {
  const [contacts, setContacts] = useState<ChatContact[]>(initialContacts);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilter, setListFilter] = useState<ListFilter>('all');

  const markRead = useCallback((contactId: string) => {
    setUnreadCounts(prev => ({ ...prev, [contactId]: 0 }));
  }, []);

  const addUnread = useCallback((contactId: string) => {
    setUnreadCounts(prev => ({ ...prev, [contactId]: (prev[contactId] || 0) + 1 }));
  }, []);

  /** Llega un mensaje (Pusher): el chat sube al inicio con ese mensaje como vista previa. */
  const receiveMessage = useCallback((contact: ChatContact, message: ChatMessage) => {
    setContacts(prev => {
      const existing = prev.find(c => c.id === contact.id);
      const others = prev.filter(c => c.id !== contact.id);
      const base = existing ? { ...existing, messages: [message] } : { ...contact, messages: [message] };
      // Un mensaje del cliente reabre la ventana de 24 h de WhatsApp.
      const updated = message.direction === 'INBOUND' && message.type !== 'REACTION'
        ? { ...base, lastInboundAt: message.timestamp }
        : base;
      return [updated, ...others];
    });
  }, []);

  /**
   * Sube el chat al inicio de la lista con su último mensaje. Al enviar desde el CRM no se
   * espera al evento de Pusher: si el websocket está dormido la lista se quedaba con el mensaje viejo.
   */
  const bumpPreview = useCallback((message: ChatMessage) => {
    setContacts(prev => {
      const existing = prev.find(c => c.id === message.contactId);
      if (!existing) return prev;
      return [{ ...existing, messages: [message] }, ...prev.filter(c => c.id !== message.contactId)];
    });
  }, []);

  const replaceContact = useCallback((contact: ChatContact) => {
    setContacts(prev => prev.map(c => (c.id === contact.id ? contact : c)));
  }, []);

  const patchContact = useCallback((contactId: string, changes: Partial<ChatContact>) => {
    setContacts(prev => prev.map(c => (c.id === contactId ? { ...c, ...changes } : c)));
  }, []);

  const addContact = useCallback((contact: ChatContact) => setContacts(prev => [contact, ...prev]), []);
  const removeContact = useCallback((contactId: string) => setContacts(prev => prev.filter(c => c.id !== contactId)), []);

  const visibleContacts = useMemo(() => contacts.filter(c => {
    const q = searchQuery.toLowerCase();
    const matches = !q || (c.name && c.name.toLowerCase().includes(q)) || (c.phone && c.phone.includes(searchQuery));
    if (!matches) return false;
    // Los chats de administradores (bot de gestión) viven en su propia pestaña, no entre los clientes.
    if (listFilter === 'admin') return !!c.isAdmin;
    if (c.isAdmin && !q) return false;
    if (listFilter === 'unread') return (unreadCounts[c.id] || 0) > 0;
    if (listFilter === 'bot') return !!c.botMode;
    if (listFilter === 'human') return !c.botMode;
    return true;
  }), [contacts, searchQuery, listFilter, unreadCounts]);

  return {
    contacts, setContacts, visibleContacts, unreadCounts,
    searchQuery, setSearchQuery, listFilter, setListFilter,
    markRead, addUnread, receiveMessage, bumpPreview, replaceContact, patchContact, addContact, removeContact,
  };
}

export type ChatContactsState = ReturnType<typeof useChatContacts>;
