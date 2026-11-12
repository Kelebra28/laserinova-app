'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  createDummyContactAction, deleteConversationAction, generateSummaryAction, retryBotReplyAction, toggleBotModeAction,
} from '@/server/actions/whatsapp.actions';
import type { ChatContact } from '../_lib/types';
import type { ChatContactsState } from './useChatContacts';
import type { ConversationState } from './useConversation';

/** Acciones sobre un chat: bot/humano, reintentar bot, contacto de prueba, resumen con IA y borrar conversación. */
export function useContactActions({ conversation, contacts }: { conversation: ConversationState; contacts: ChatContactsState }) {
  const [retryingBot, setRetryingBot] = useState(false);
  const [summary, setSummary] = useState({ open: false, loading: false, text: '' });
  // Resumen por chat y cuántos mensajes había: si no llegó nada nuevo se reutiliza y no se gastan tokens.
  const [summaryCache, setSummaryCache] = useState<Record<string, { text: string; messageCount: number }>>({});
  const [contactToDelete, setContactToDelete] = useState<ChatContact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleBotMode = async () => {
    const { activeContact } = conversation;
    if (!activeContact) return;
    const newMode = !activeContact.botMode;
    // Optimista
    const updated = { ...activeContact, botMode: newMode };
    conversation.setActiveContact(updated);
    contacts.replaceContact(updated);
    try {
      await toggleBotModeAction(activeContact.id, newMode);
      toast.success(`Modo ${newMode ? 'Bot' : 'Humano'} activado`);
    } catch {
      toast.error('Error al cambiar modo');
      conversation.setActiveContact(activeContact);
      contacts.replaceContact(activeContact);
    }
  };

  const retryBotReply = async () => {
    const { activeContact } = conversation;
    if (!activeContact || retryingBot) return;
    setRetryingBot(true);
    try {
      const res = await retryBotReplyAction(activeContact.id);
      if (res.success) toast.success('El bot ya respondió');
      else toast.error(res.error || 'No se pudo reintentar');
    } catch {
      toast.error('Error al reintentar el bot');
    } finally {
      setRetryingBot(false);
    }
  };

  const createDummyContact = async () => {
    try {
      const res = await createDummyContactAction();
      if (res.success && res.contact) {
        const contact = res.contact as ChatContact;
        contacts.addContact(contact);
        conversation.openContact(contact);
        conversation.setSimulatorMode(true); // el contacto de prueba abre en modo simulador
        toast.success('Contacto de prueba creado');
      }
    } catch {
      toast.error('Error al crear contacto de prueba');
    }
  };

  const openSummary = async () => {
    const { activeContact, messages } = conversation;
    if (!activeContact) return;
    const messageCount = messages.length;
    const cached = summaryCache[activeContact.id];
    if (cached && cached.messageCount === messageCount) {
      setSummary({ open: true, loading: false, text: cached.text });
      return;
    }
    setSummary({ open: true, loading: true, text: '' });
    try {
      const res = await generateSummaryAction(activeContact.id);
      if (res.success) {
        setSummary({ open: true, loading: false, text: res.summary! });
        setSummaryCache(prev => ({ ...prev, [activeContact.id]: { text: res.summary!, messageCount } }));
      } else {
        setSummary({ open: true, loading: false, text: 'Error al generar resumen: ' + res.error });
      }
    } catch {
      setSummary({ open: true, loading: false, text: 'Error al procesar el resumen.' });
    }
  };

  const closeSummary = () => setSummary(prev => ({ ...prev, open: false }));

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteConversationAction(contactToDelete.id);
      if (res.success) {
        toast.success('Conversación eliminada');
        contacts.removeContact(contactToDelete.id);
        if (conversation.activeContact?.id === contactToDelete.id) {
          conversation.close();
          conversation.setMessages([]);
        }
        setContactToDelete(null);
      } else {
        toast.error(res.error || 'Error al eliminar conversación');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar conversación');
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    toggleBotMode, retryBotReply, retryingBot, createDummyContact,
    summary, openSummary, closeSummary,
    contactToDelete, setContactToDelete, isDeleting, confirmDelete,
  };
}
