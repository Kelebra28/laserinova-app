'use client';

import { useEffect, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher';

type UseWhatsAppEventsProps = {
  onNewMessage?: (message: any) => void;
  onStatusUpdate?: (statusData: any) => void;
  onContactUpdate?: (contactData: any) => void;
};

export function useWhatsAppEvents({ onNewMessage, onStatusUpdate, onContactUpdate }: UseWhatsAppEventsProps = {}) {
  const onNewMessageRef = useRef(onNewMessage);
  const onStatusUpdateRef = useRef(onStatusUpdate);
  const onContactUpdateRef = useRef(onContactUpdate);

  // Mantiene las referencias actualizadas
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onStatusUpdateRef.current = onStatusUpdate;
    onContactUpdateRef.current = onContactUpdate;
  }, [onNewMessage, onStatusUpdate, onContactUpdate]);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe('crm-channel');

    channel.bind('whatsapp_message', (data: any) => {
      const isSimulator = data?.contact?.name?.includes('(Simulador)') || data?.contact?.phone?.includes('5211058132407');
      const isIncoming = data?.message?.direction === 'INBOUND';

      // Reproducir sonido para:
      // 1. Mensajes entrantes reales de clientes (INBOUND)
      // 2. Todos los mensajes del chat del Simulador (para escuchar cuando la IA nos responde)
      if (isIncoming || isSimulator) {
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

    channel.bind('whatsapp_status_update', (data: any) => {
      if (onStatusUpdateRef.current) {
        onStatusUpdateRef.current(data);
      }
    });

    channel.bind('whatsapp_contact_update', (data: any) => {
      if (onContactUpdateRef.current) {
        onContactUpdateRef.current(data);
      }
    });

    // Cleanup: desuscribirse al desmontar el componente
    return () => {
      channel.unbind_all();
      pusher.unsubscribe('crm-channel');
    };
  }, []);
}
