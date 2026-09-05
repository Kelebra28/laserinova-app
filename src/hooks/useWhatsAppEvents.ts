'use client';

import { useEffect, useRef } from 'react';

type UseWhatsAppEventsProps = {
  onNewMessage?: (message: any) => void;
  onStatusUpdate?: (statusData: any) => void;
};

export function useWhatsAppEvents({ onNewMessage, onStatusUpdate }: UseWhatsAppEventsProps = {}) {
  const onNewMessageRef = useRef(onNewMessage);
  const onStatusUpdateRef = useRef(onStatusUpdate);

  // Mantiene las referencias siempre actualizadas sin disparar el useEffect de conexión
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onStatusUpdateRef.current = onStatusUpdate;
  }, [onNewMessage, onStatusUpdate]);

  useEffect(() => {
    // PREVENCIÓN DE FUGAS DE MEMORIA: Manejo estricto de la conexión EventSource
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      eventSource = new EventSource('/api/whatsapp/events');

      eventSource.addEventListener('whatsapp_message', (e) => {
        if (onNewMessageRef.current && e.data) {
          try {
            onNewMessageRef.current(JSON.parse(e.data));
          } catch (err) {
            console.error('Error parsing SSE whatsapp_message:', err);
          }
        }
      });

      eventSource.addEventListener('whatsapp_status_update', (e) => {
        if (onStatusUpdateRef.current && e.data) {
          try {
            onStatusUpdateRef.current(JSON.parse(e.data));
          } catch (err) {
            console.error('Error parsing SSE whatsapp_status_update:', err);
          }
        }
      });

      eventSource.onerror = (error) => {
        console.error('Error en SSE de WhatsApp, reconectando en 5s...', error);
        if (eventSource) {
          eventSource.close();
        }
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    // CLEANUP: Es crucial cerrar la conexión al desmontar el componente para evitar Memory Leaks
    return () => {
      clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []); // Dependencias vacías: Solo se conecta al montar el componente
}
