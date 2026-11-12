'use client';

import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { ChatListPanel, EmptyConversation } from './_components/ChatListPanel';
import { ConversationHeader } from './_components/ConversationHeader';
import { MessageList } from './_components/MessageList';
import { ActiveWindowNotice } from './_components/WindowNotice';
import { ComposerBar } from './_components/ComposerBar';
import type { ComposerHandle } from './_components/Composer';
import { useChatContacts } from './_hooks/useChatContacts';
import { useConversation } from './_hooks/useConversation';
import { useAudioRecorder } from './_hooks/useAudioRecorder';
import { useSendMessage } from './_hooks/useSendMessage';
import { useChatRealtime } from './_hooks/useChatRealtime';
import { useContactActions } from './_hooks/useContactActions';
import { useStableCallback } from './_hooks/useStableCallback';
import { isSimulatorContact, type ChatContact, type ChatMessage } from './_lib/types';

// Modales: se descargan solo cuando se abren, no con la pantalla del chat.
const CalculateQuoteModal = dynamic(() => import('./CalculateQuoteModal'));
const SummaryModal = dynamic(() => import('./_components/SummaryModal'));

type Props = {
  initialContacts: ChatContact[];
  /** Chat del link de una notificación (?c=<id>). */
  initialContactId?: string;
  /** Historial de ese chat, ya cargado en el servidor. */
  initialMessages?: ChatMessage[] | null;
};

/**
 * Pantalla de chats de WhatsApp. Solo compone: el estado vive en los hooks de `_hooks/`
 * y la interfaz en los componentes de `_components/`.
 */
export default function ChatLayout({ initialContacts, initialContactId, initialMessages }: Props) {
  const linked = initialContactId ? initialContacts.find(c => c.id === initialContactId) ?? null : null;

  const contacts = useChatContacts(initialContacts);
  const conversation = useConversation({
    preloadedContact: initialMessages ? linked : null,
    preloadedMessages: initialMessages ?? null,
    linkTarget: initialMessages ? null : linked,
    onOpen: contacts.markRead,
  });
  const recorder = useAudioRecorder();
  const composerRef = useRef<ComposerHandle>(null);
  const sender = useSendMessage({ conversation, contacts, composerRef, recorder });
  const actions = useContactActions({ conversation, contacts });
  useChatRealtime({ conversation, contacts });
  const [isCalculateOpen, setIsCalculateOpen] = useState(false);

  const { activeContact, simulatorMode, setMessages } = conversation;
  const showWindowNotice = !!activeContact && !activeContact.isAdmin && !simulatorMode && !isSimulatorContact(activeContact);

  // Handlers con identidad fija para los componentes memorizados (lista y burbujas).
  const openContact = useStableCallback(conversation.openContact);
  const reactToMessage = useCallback((msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, reaction: emoji } : m)));
  }, [setMessages]);
  const sendFromComposer = useStableCallback(() => { sender.send(); });

  return (
    <div className="flex h-full bg-wa-chat text-wa-text border-x border-wa-border">
      <ChatListPanel
        hasActiveChat={!!activeContact}
        activeContactId={activeContact?.id ?? null}
        totalContacts={contacts.contacts.length}
        visibleContacts={contacts.visibleContacts}
        unreadCounts={contacts.unreadCounts}
        searchQuery={contacts.searchQuery}
        onSearchChange={contacts.setSearchQuery}
        listFilter={contacts.listFilter}
        onFilterChange={contacts.setListFilter}
        onOpen={openContact}
        onDelete={actions.setContactToDelete}
        onCreateTestContact={actions.createDummyContact}
      />

      {activeContact ? (
        <section className="flex flex-col bg-wa-chat relative flex-1 min-w-0">
          <div className="absolute inset-0 pointer-events-none z-0 opacity-100 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:22px_22px]" />

          {simulatorMode && (
            <div className="bg-amber-500/10 text-amber-400 border-b border-amber-500/20 text-xs font-medium py-1.5 px-4 text-center shrink-0 z-20">
              Modo simulador: escribes como si fueras el cliente. No se envían mensajes reales.
            </div>
          )}

          <ConversationHeader
            contact={activeContact}
            simulatorMode={simulatorMode}
            pendingQuoteUrl={conversation.pendingQuoteUrl}
            retryingBot={actions.retryingBot}
            onBack={conversation.close}
            onCalculate={() => setIsCalculateOpen(true)}
            onToggleSimulator={() => conversation.setSimulatorMode(!simulatorMode)}
            onToggleBot={actions.toggleBotMode}
            onRetryBot={actions.retryBotReply}
            onSummary={actions.openSummary}
            onDelete={() => actions.setContactToDelete(activeContact)}
          />

          <MessageList
            messages={conversation.messages}
            loading={conversation.loadingMessages}
            simulatorMode={simulatorMode}
            endRef={conversation.messagesEndRef}
            onReact={reactToMessage}
            onReply={sender.setReplyingTo}
          />

          {showWindowNotice && !conversation.loadingMessages && (
            <ActiveWindowNotice lastInboundAt={conversation.activeLastInbound} />
          )}

          <ComposerBar
            composerRef={composerRef}
            simulatorMode={simulatorMode}
            isUploading={sender.isUploading}
            replyingTo={sender.replyingTo}
            onCancelReply={() => sender.setReplyingTo(null)}
            stagedFiles={sender.stagedFiles}
            onAddFiles={sender.addStagedFiles}
            onRemoveFile={sender.removeStagedFile}
            onClearFiles={sender.clearStagedFiles}
            recorder={recorder}
            onSend={sendFromComposer}
          />
        </section>
      ) : (
        <EmptyConversation />
      )}

      {isCalculateOpen && activeContact && (
        <CalculateQuoteModal
          key={activeContact.id}
          contactId={activeContact.id}
          onClose={() => setIsCalculateOpen(false)}
          onDone={(message: ChatMessage) => {
            setIsCalculateOpen(false);
            if (conversation.activeContactIdRef.current === message.contactId) conversation.appendMessage(message);
            contacts.bumpPreview(message);
          }}
        />
      )}

      {actions.summary.open && (
        <SummaryModal loading={actions.summary.loading} text={actions.summary.text} onClose={actions.closeSummary} />
      )}

      <ConfirmationModal
        isOpen={!!actions.contactToDelete}
        onClose={() => actions.setContactToDelete(null)}
        onConfirm={actions.confirmDelete}
        isLoading={actions.isDeleting}
        title="Eliminar Conversación"
        message={`¿Estás seguro de que deseas eliminar permanentemente el chat con ${actions.contactToDelete?.name || actions.contactToDelete?.phone || 'este contacto'}? Se borrará todo el historial de mensajes de forma definitiva.`}
        confirmText="Sí, Eliminar Chat"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
