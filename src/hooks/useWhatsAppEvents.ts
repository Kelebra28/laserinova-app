'use client';

import { useEffect, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher';
import { REALTIME_CHANNEL, REALTIME_EVENTS } from '@/constants/realtime';
import { isSimulatorContact } from '@/constants/whatsapp';

type UseWhatsAppEventsProps = {
  onNewMessage?: (message: any) => void;
  onStatusUpdate?: (statusData: any) => void;
  onContactUpdate?: (contactData: any) => void;
  onReaction?: (data: { id: string; contactId: string; reaction: string | null }) => void;
};

export function useWhatsAppEvents({ onNewMessage, onStatusUpdate, onContactUpdate, onReaction }: UseWhatsAppEventsProps = {}) {
  const onNewMessageRef = useRef(onNewMessage);
  const onStatusUpdateRef = useRef(onStatusUpdate);
  const onContactUpdateRef = useRef(onContactUpdate);
  const onReactionRef = useRef(onReaction);

  // Mantiene las referencias actualizadas
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onStatusUpdateRef.current = onStatusUpdate;
    onContactUpdateRef.current = onContactUpdate;
    onReactionRef.current = onReaction;
  }, [onNewMessage, onStatusUpdate, onContactUpdate, onReaction]);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(REALTIME_CHANNEL);

    channel.bind(REALTIME_EVENTS.whatsappMessage, (data: any) => {
      const isSimulator = isSimulatorContact(data?.contact);
      const isIncoming = data?.message?.direction === 'INBOUND';
      const isOutbound = data?.message?.direction === 'OUTBOUND';

      // Reproducir sonido para:
      // 1. Clientes reales: Solo cuando el cliente nos escribe (INBOUND)
      // 2. Simulador: Solo cuando la IA nos responde (OUTBOUND)
      const shouldPlaySound = (!isSimulator && isIncoming) || (isSimulator && isOutbound);

      if (shouldPlaySound) {
        const audioEl = document.getElementById('notification-sound') as HTMLAudioElement;
        if (audioEl) {
          audioEl.currentTime = 0; // Reiniciar por si suenan varios seguidos
          audioEl.play().catch(e => console.log('Autoplay bloqueado:', e));
        }
      }

      if (onNewMessageRef.current) {
        onNewMessageRef.current(data);
      }
    });

    channel.bind(REALTIME_EVENTS.whatsappStatusUpdate, (data: any) => {
      if (onStatusUpdateRef.current) {
        onStatusUpdateRef.current(data);
      }
    });

    channel.bind(REALTIME_EVENTS.whatsappContactUpdate, (data: any) => {
      if (onContactUpdateRef.current) {
        onContactUpdateRef.current(data);
      }
    });

    channel.bind(REALTIME_EVENTS.whatsappReaction, (data: any) => {
      if (onReactionRef.current) onReactionRef.current(data);
    });

    // Cleanup: desuscribirse al desmontar el componente
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(REALTIME_CHANNEL);
    };
  }, []);
}
