import { NextResponse } from 'next/server';
import { processIncomingMessage, processAIAgentResponse } from '@/server/services/whatsapp.service';
import { notificationEmitter } from '@/lib/notification-emitter';
import { prisma } from '@/lib/prisma';

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Bad Request', { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object) {
      if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
        // Procesar mensaje entrante
        const result = await processIncomingMessage(body.entry[0]);
        
        if (result) {
          // Emitir evento al frontend
          if (result.type === 'message') {
            const pusherMessage = { ...result.message };
            if (pusherMessage.mediaUrl && pusherMessage.mediaUrl.length > 5000) {
              pusherMessage.mediaUrl = 'FETCH_REQUIRED';
            }
            notificationEmitter.emit('whatsapp_message', { message: pusherMessage, contact: result.contact });
            
            // IA: Responder si botMode está activado
            if (result.contact?.botMode && result.message?.type === 'TEXT') {
              // Llamar al servicio especializado de IA de WhatsApp
              processAIAgentResponse(result.contact.id).catch(err => {
                console.error("Error asíncrono en processAIAgentResponse:", err);
              });
            }
          } else if (result.type === 'status') {
            notificationEmitter.emit('whatsapp_status_update', result.data);
          }
        }
      }

      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Error procesando el webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
