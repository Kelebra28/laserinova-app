'use client';

import { useCallback, useState, type RefObject } from 'react';
import { toast } from 'react-hot-toast';
import { sendManualMessageAction, sendMediaMessageAction, simulateIncomingMessageAction } from '@/server/actions/whatsapp.actions';
import { audioFileInfo } from '../_lib/audio-format';
import type { ChatMessage } from '../_lib/types';
import type { ComposerHandle } from '../_components/Composer';
import type { AudioRecorder } from './useAudioRecorder';
import type { ChatContactsState } from './useChatContacts';
import type { ConversationState } from './useConversation';

type Options = {
  conversation: ConversationState;
  contacts: ChatContactsState;
  composerRef: RefObject<ComposerHandle | null>;
  recorder: AudioRecorder;
};

/** Envío de texto, adjuntos y notas de voz, con mensajes optimistas. También guarda adjuntos y "responder a". */
export function useSendMessage({ conversation, contacts, composerRef, recorder }: Options) {
  const [isUploading, setIsUploading] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  const addStagedFiles = useCallback((files: File[]) => setStagedFiles(prev => [...prev, ...files]), []);
  const removeStagedFile = useCallback((index: number) => setStagedFiles(prev => prev.filter((_, i) => i !== index)), []);
  const clearStagedFiles = useCallback(() => setStagedFiles([]), []);

  const sendText = async (text: string, replyContext: ChatMessage | null) => {
    const { activeContact, simulatorMode } = conversation;
    if (!activeContact) return;
    // Si estamos respondiendo a un mensaje, agregamos el contexto al texto visible
    // (En WhatsApp Cloud real, se envía `context: { message_id: ... }`).
    let finalContent = text;
    if (replyContext) {
      const quoted = replyContext.content ?? '';
      finalContent = `*[Respuesta a: ${quoted.substring(0, 30)}${quoted.length > 30 ? '...' : ''}]*\n${text}`;
    }

    const optimisticMessage: ChatMessage = {
      id: `opt_${Date.now()}`,
      contactId: activeContact.id,
      messageId: `opt_${Date.now()}`,
      direction: simulatorMode ? 'INBOUND' : 'OUTBOUND',
      type: 'TEXT',
      content: finalContent,
      status: 'SENT',
      timestamp: new Date().toISOString(),
    };
    conversation.setMessages(prev => [...prev, optimisticMessage]);

    try {
      if (simulatorMode) {
        const res = await simulateIncomingMessageAction(activeContact.id, finalContent);
        if (res.success && res.message) {
          conversation.replaceMessage(optimisticMessage.id, res.message as ChatMessage);
          contacts.bumpPreview(res.message as ChatMessage);
        } else {
          conversation.removeMessage(optimisticMessage.id);
          toast.error(res.error || 'Error al simular mensaje');
        }
      } else {
        const res = await sendManualMessageAction(activeContact.id, finalContent);
        if (res.success && res.message) {
          conversation.replaceMessage(optimisticMessage.id, res.message as ChatMessage);
          contacts.bumpPreview(res.message as ChatMessage);
          // Contestar a mano apaga el bot en ese chat.
          if (activeContact.botMode) {
            const updatedContact = { ...activeContact, botMode: false };
            conversation.setActiveContact(updatedContact);
            contacts.replaceContact(updatedContact);
          }
        } else {
          conversation.removeMessage(optimisticMessage.id);
          toast.error(res.error || 'Error al enviar');
        }
      }
    } catch {
      conversation.removeMessage(optimisticMessage.id);
      toast.error('Ocurrió un error al enviar el mensaje');
    }
  };

  const send = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const { activeContact, simulatorMode } = conversation;
    const textToSend = composerRef.current?.getText() ?? '';
    const audioToSend = recorder.recordedAudio;
    if ((!textToSend.trim() && stagedFiles.length === 0 && !audioToSend) || !activeContact) return;

    const filesToSend = [...stagedFiles];
    const replyingToMessage = replyingTo;

    composerRef.current?.clear();
    setStagedFiles([]);
    recorder.clearRecorded();
    setReplyingTo(null);

    if (filesToSend.length === 0 && !audioToSend) {
      await sendText(textToSend, replyingToMessage);
      return;
    }

    // Archivos y audio van por sendMediaMessageAction
    setIsUploading(true);
    try {
      if (audioToSend) {
        const formData = new FormData();
        const { mimeType: audioType, extension } = audioFileInfo(audioToSend.type);
        formData.append('file', new File([audioToSend], `audio_message_${Date.now()}.${extension}`, { type: audioType }));
        formData.append('contactId', activeContact.id);
        formData.append('simulatorMode', String(simulatorMode));
        const res = await sendMediaMessageAction(formData);
        if (res.success && res.message) {
          conversation.appendMessage(res.message as ChatMessage);
          contacts.bumpPreview(res.message as ChatMessage);
        }
      }

      // Cada archivo en orden; el texto va como pie del primero
      for (let i = 0; i < filesToSend.length; i++) {
        const formData = new FormData();
        formData.append('file', filesToSend[i]);
        formData.append('contactId', activeContact.id);
        formData.append('simulatorMode', String(simulatorMode));
        if (i === 0 && textToSend.trim()) formData.append('caption', textToSend);

        const res = await sendMediaMessageAction(formData);
        if (res.success && res.message) {
          conversation.appendMessage(res.message as ChatMessage);
          contacts.bumpPreview(res.message as ChatMessage);
        } else {
          toast.error(res.error || `Error al subir archivo ${i + 1}`);
        }
      }
    } catch {
      toast.error('Error al subir archivos');
    } finally {
      setIsUploading(false);
    }

    // Audio + texto sin archivos: el texto se manda aparte
    if (filesToSend.length === 0 && textToSend.trim()) {
      await sendText(textToSend, replyingToMessage);
    }
  };

  return {
    isUploading, stagedFiles, addStagedFiles, removeStagedFile, clearStagedFiles,
    replyingTo, setReplyingTo, send,
  };
}

export type SendMessageState = ReturnType<typeof useSendMessage>;
