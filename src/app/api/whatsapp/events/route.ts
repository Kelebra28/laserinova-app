import { NextResponse } from 'next/server';
import { notificationEmitter } from '@/lib/notification-emitter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Configuración de cabeceras para SSE
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const stream = new ReadableStream({
    start(controller) {
      // Función para enviar eventos al cliente
      const sendEvent = (event: string, data: any) => {
        try {
          const formattedData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(new TextEncoder().encode(formattedData));
        } catch (error) {
          console.error('Error enviando evento SSE:', error);
        }
      };

      // Latido (Heartbeat) para mantener la conexión viva
      const keepAlive = setInterval(() => {
        sendEvent('ping', { timestamp: new Date().toISOString() });
      }, 30000); // Cada 30 segundos

      // Listener para nuevos mensajes de WhatsApp
      const handleNewWhatsAppMessage = (data: any) => {
        sendEvent('whatsapp_message', data);
      };

      // Listener para actualización de estado de mensajes
      const handleWhatsAppStatusUpdate = (data: any) => {
        sendEvent('whatsapp_status_update', data);
      };

      // Suscripción a eventos
      notificationEmitter.on('whatsapp_message', handleNewWhatsAppMessage);
      notificationEmitter.on('whatsapp_status_update', handleWhatsAppStatusUpdate);

      // Manejo de desconexión del cliente
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        notificationEmitter.off('whatsapp_message', handleNewWhatsAppMessage);
        notificationEmitter.off('whatsapp_status_update', handleWhatsAppStatusUpdate);
        try {
          controller.close();
        } catch (e) {
          // Ignorar si ya está cerrado
        }
      });
    }
  });

  return new NextResponse(stream, { headers });
}
