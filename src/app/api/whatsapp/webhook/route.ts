import { NextResponse } from 'next/server';
import { processIncomingMessage, sendMessageToMeta } from '@/server/services/whatsapp.service';
import { notificationEmitter } from '@/lib/notification-emitter';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

// Configurar Gemini para responder
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verificado exitosamente');
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
            notificationEmitter.emit('whatsapp_message', result);
            
            // IA: Responder si botMode está activado
            if (result.contact?.botMode && result.message?.type === 'TEXT') {
              try {
                // Obtener historial reciente para dar contexto a la IA
                const recentMessages = await prisma.whatsAppMessage.findMany({
                  where: { contactId: result.contact.id },
                  orderBy: { timestamp: 'desc' },
                  take: 5
                });

                const conversationHistory = recentMessages.reverse().map(m => 
                  `${m.direction === 'INBOUND' ? 'Cliente' : 'Asistente'}: ${m.content}`
                ).join('\n');

                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                
                // Prompt del sistema
                const prompt = `Eres el asistente virtual de Laser Inova, una empresa de corte y grabado láser. 
Tu objetivo es responder de manera amable, corta y profesional.
Aquí está la conversación reciente:
${conversationHistory}

Responde al cliente de forma natural basándote en su último mensaje.`;

                const aiResponse = await model.generateContent(prompt);
                const replyText = aiResponse.response.text();

                // Enviar la respuesta vía WhatsApp API
                const metaResponse = await sendMessageToMeta(result.contact.phone, {
                  type: 'text',
                  text: { body: replyText }
                });

                // Guardar la respuesta de la IA en la base de datos
                if (metaResponse?.messages?.[0]?.id) {
                  const savedReply = await prisma.whatsAppMessage.create({
                    data: {
                      contactId: result.contact.id,
                      messageId: metaResponse.messages[0].id,
                      direction: 'OUTBOUND',
                      type: 'TEXT',
                      content: replyText,
                      status: 'SENT',
                    }
                  });

                  // Emitir evento de la respuesta de la IA al frontend
                  notificationEmitter.emit('whatsapp_message', { message: savedReply, contact: result.contact });
                }

              } catch (aiError) {
                console.error("Error al generar respuesta con IA:", aiError);
              }
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
