export const dynamic = 'force-dynamic';
// La respuesta de la IA corre después de contestar a Meta (ver after() abajo); darle margen.
export const maxDuration = 60;
import { NextResponse, after } from 'next/server';
import crypto from 'crypto';
import { processIncomingMessage, processAIAgentResponse } from '@/server/services/whatsapp.service';
import { notificationEmitter } from '@/lib/notification-emitter';
import { prisma } from '@/lib/prisma';

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

// Meta firma cada POST con HMAC-SHA256 del body crudo usando el App Secret.
function isValidSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) {
    // Sin secreto no se puede verificar: en producción se rechaza, en desarrollo se deja pasar.
    if (process.env.NODE_ENV === 'production') {
      console.error('WHATSAPP_APP_SECRET no configurado: webhook rechazado.');
      return false;
    }
    console.warn('WHATSAPP_APP_SECRET no configurado: se omite la verificación de firma (solo desarrollo).');
    return true;
  }
  if (!header || !header.startsWith('sha256=')) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = header.slice('sha256='.length);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(received, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

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
    const rawBody = await request.text();
    if (!isValidSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    const body = JSON.parse(rawBody);

    if (body.object) {
      // Meta manda mensajes entrantes (value.messages) y también estados de entrega/lectura (value.statuses).
      // Antes solo se procesaban los primeros, por eso las palomitas se quedaban en "enviado".
      const value = body.entry?.[0]?.changes?.[0]?.value;
      if (value && (value.messages || value.statuses)) {
        // Procesar mensaje entrante o actualización de estado
        const result = await processIncomingMessage(body.entry[0]);
        
        if (result) {
          // Emitir evento al frontend
          if (result.type === 'message') {
            const pusherMessage = { ...result.message };
            if (pusherMessage.mediaUrl && pusherMessage.mediaUrl.length > 5000) {
              pusherMessage.mediaUrl = 'FETCH_REQUIRED';
            }
            await notificationEmitter.emit('whatsapp_message', { message: pusherMessage, contact: result.contact });
            
            // IA: Responder si botMode está activado
            if (result.contact?.botMode && !result.skipBot && ['TEXT', 'IMAGE', 'AUDIO'].includes(result.message?.type)) {
              // Llamar al servicio especializado de IA de WhatsApp
              // En Vercel la función se congela al responder; after() la mantiene viva hasta terminar.
              const contactId = result.contact.id;
              after(async () => {
                try {
                  await processAIAgentResponse(contactId);
                } catch (err) {
                  console.error("Error asíncrono en processAIAgentResponse:", err);
                }
              });
            }
          } else if (result.type === 'status') {
            await notificationEmitter.emit('whatsapp_status_update', result.data);
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
