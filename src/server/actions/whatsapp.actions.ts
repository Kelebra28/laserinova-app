'use server';
import fs from 'fs';
import path from 'path';

import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendMessageToMeta, processAIAgentResponse, deleteConversationService, clearConversationMessagesService } from '@/server/services/whatsapp.service';
import { notificationEmitter } from '@/lib/notification-emitter';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { revalidatePath } from 'next/cache';

export async function simulateIncomingMessageAction(contactId: string, content: string) {
  try {
    await requireAuth();

    const contact = await prisma.whatsAppContact.findUnique({
      where: { id: contactId }
    });

    if (!contact) throw new Error("Contacto no encontrado");

    // Crear el mensaje entrante falso
    const fakeMessageId = `sim_${Date.now()}`;
    const savedMessage = await prisma.whatsAppMessage.create({
      data: {
        contactId: contact.id,
        messageId: fakeMessageId,
        direction: 'INBOUND',
        type: 'TEXT',
        content,
        status: 'DELIVERED',
      }
    });

    // Notificar a la UI
    const pusherMessage = { ...savedMessage };
    if (pusherMessage.mediaUrl && pusherMessage.mediaUrl.length > 5000) {
      pusherMessage.mediaUrl = 'FETCH_REQUIRED';
    }
    notificationEmitter.emit('whatsapp_message', { message: pusherMessage, contact });

    // Procesar con IA (debemos hacer await para que Vercel/Next.js no mate el proceso antes de que Gemini responda)
    await processAIAgentResponse(contact.id).catch(console.error);

    return { success: true, message: savedMessage };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error desconocido' };
  }
}


export async function getMessagesAction(contactId: string) {
  await requireAuth();
  
  const messages = await prisma.whatsAppMessage.findMany({
    where: { contactId },
    orderBy: { timestamp: 'asc' },
    select: {
      id: true,
      messageId: true,
      contactId: true,
      direction: true,
      type: true,
      content: true,
      status: true,
      timestamp: true,
      mimeType: true,
      mediaUrl: true,
    }
  });

  // Strip Base64 data to avoid massive JSON payloads, but keep external HTTP URLs
  const cleanedData = messages.map(msg => ({
    ...msg,
    mediaUrl: msg.mediaUrl?.startsWith('http') ? msg.mediaUrl : (msg.mediaUrl ? 'FETCH_REQUIRED' : null)
  }));

  return { success: true, data: cleanedData };
}


export async function sendManualMessageAction(contactId: string, content: string) {
  await requireAuth();

  const contact = await prisma.whatsAppContact.findUnique({
    where: { id: contactId }
  });

  if (!contact) throw new Error("Contacto no encontrado");

  // Al enviar manual, apagamos el bot
  if (contact.botMode) {
    await prisma.whatsAppContact.update({
      where: { id: contact.id },
      data: { botMode: false }
    });
  }

  // Enviar mensaje a Meta
  const metaResponse = await sendMessageToMeta(contact.phone, {
    type: 'text',
    text: { body: content }
  });

  // Si falló por falta de token pero estamos en entorno de prueba/local, mockeamos la respuesta
  const messageIdToSave = metaResponse?.messages?.[0]?.id || `manual_sim_${Date.now()}`;
  const isSimulationFallback = !metaResponse && (!process.env.WHATSAPP_TOKEN || contact.name?.includes("Simulador"));

  if (metaResponse || isSimulationFallback) {
    const savedMessage = await prisma.whatsAppMessage.create({
      data: {
        contactId: contact.id,
        messageId: messageIdToSave,
        direction: 'OUTBOUND',
        type: 'TEXT',
        content,
        status: isSimulationFallback ? 'SENT_LOCAL_SIMULATION' : 'SENT',
      }
    });

    // Notificar al frontend
    const pusherMessage = { ...savedMessage };
    if (pusherMessage.mediaUrl && pusherMessage.mediaUrl.length > 5000) {
      pusherMessage.mediaUrl = 'FETCH_REQUIRED';
    }
    notificationEmitter.emit('whatsapp_message', { message: pusherMessage, contact });
    
    return { success: true, message: savedMessage };
  }

  return { success: false, error: 'No se pudo enviar el mensaje a Meta. Verifica tus tokens.' };
}

export async function toggleBotModeAction(contactId: string, botMode: boolean) {
  await requireAuth();
  
  await prisma.whatsAppContact.update({
    where: { id: contactId },
    data: { botMode }
  });

  // Emit event to update UI across all browsers
  notificationEmitter.emit('whatsapp_contact_update', {
    contactId,
    changes: { botMode }
  });

  return { success: true };
}

export async function createDummyContactAction() {
  await requireAuth();
  
  const dummyContact = await prisma.whatsAppContact.create({
    data: {
      name: "Cliente de Prueba (Simulador)",
      phone: "521" + Math.floor(1000000000 + Math.random() * 9000000000).toString(),
      botMode: true,
    }
  });

  return { success: true, contact: dummyContact };
}

export async function sendMediaMessageAction(formData: FormData) {
  try {
    await requireAuth();
    
    const file = formData.get('file') as File;
    const contactId = formData.get('contactId') as string;
    const isSimulator = formData.get('simulatorMode') === 'true';
    const caption = formData.get('caption') as string;

    if (!file || !contactId) return { success: false, error: 'Faltan datos' };

    const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } });
    if (!contact) return { success: false, error: 'Contacto no encontrado' };

    // 1. Vercel es Read-Only. Guardar en Base64 directo a la BD.
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'application/octet-stream';
    const mediaUrl = `data:${mimeType};base64,${base64}`;

    // Determinar tipo
    let type = 'DOCUMENT';
    if (mimeType.startsWith('image/')) type = 'IMAGE';
    else if (mimeType.startsWith('audio/')) type = 'AUDIO';
    else if (mimeType.startsWith('video/')) type = 'VIDEO';

    // 2. Determinar si es simulador (INBOUND) o flujo normal (OUTBOUND)
    const direction = isSimulator ? 'INBOUND' : 'OUTBOUND';
    const fakeMessageId = `media_${Date.now()}`;

    // 3. Si NO es simulador, debemos subir el archivo a Meta y enviarlo por WhatsApp
    let metaMessageId = fakeMessageId;
    
    if (!isSimulator && process.env.WHATSAPP_TOKEN) {
      try {
        // A. Subir archivo a Meta
        const metaFormData = new FormData();
        const blob = new Blob([buffer], { type: mimeType });
        metaFormData.append('file', blob, file.name || 'file');
        metaFormData.append('type', mimeType);
        metaFormData.append('messaging_product', 'whatsapp');

        const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
          },
          body: metaFormData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error?.message || 'Error subiendo media a Meta');
        
        const mediaId = uploadData.id;

        // B. Enviar el mensaje con el mediaId
        const metaMessageRes = await sendMessageToMeta(contact.phone, {
          type: type.toLowerCase(),
          [type.toLowerCase()]: { 
            id: mediaId,
            ...(caption ? { caption } : {}),
            ...(type === 'DOCUMENT' ? { filename: file.name || 'documento' } : {})
          }
        });

        if (metaMessageRes?.messages?.[0]?.id) {
          metaMessageId = metaMessageRes.messages[0].id;
        }
      } catch (e) {
        console.error("Error enviando media a Meta:", e);
        return { success: false, error: 'Error al enviar por WhatsApp real' };
      }
    }

    // 4. Crear en BD
    const savedMessage = await prisma.whatsAppMessage.create({
      data: {
        contactId: contact.id,
        messageId: metaMessageId,
        direction,
        type,
        content: caption ? caption : (isSimulator && type !== 'AUDIO' ? file.name : (type === 'IMAGE' ? '📷 Imagen adjunta' : type === 'AUDIO' ? '🎤 Mensaje de voz' : '📄 Archivo adjunto')),
        mediaUrl,
        mimeType,
        status: isSimulator ? 'DELIVERED' : (process.env.WHATSAPP_TOKEN ? 'SENT' : 'SENT_LOCAL_SIMULATION')
      }
    });

    const pusherMessage = { ...savedMessage };
    if (pusherMessage.mediaUrl && pusherMessage.mediaUrl.length > 5000) {
      pusherMessage.mediaUrl = 'FETCH_REQUIRED';
    }
    notificationEmitter.emit('whatsapp_message', { message: pusherMessage, contact });

    // 4. Si es simulador (cliente envía), procesar con IA
    if (isSimulator) {
      await processAIAgentResponse(contact.id).catch(console.error);
    } else if (contact.botMode) {
      // Si el agente manda algo manual, se apaga el bot
      await toggleBotModeAction(contact.id, false);
    }

    return { success: true, message: savedMessage };
  } catch (error: any) {
    console.error("🚨 Error FATAL en sendMediaMessageAction:", error);
    return { success: false, error: error.message || 'Error al procesar archivo' };
  }
}

export async function generateSummaryAction(contactId: string) {
  try {
    const contact = await prisma.whatsAppContact.findUnique({
      where: { id: contactId }
    });
    if (!contact) return { success: false, error: 'Contacto no encontrado' };

    const messages = await prisma.whatsAppMessage.findMany({
      where: { contactId },
      orderBy: { timestamp: 'desc' },
      take: 40
    });

    if (messages.length === 0) return { success: false, error: 'No hay mensajes para resumir' };

    let transcript = '';
    for (const m of messages.reverse()) {
      if (m.type === 'TEXT') {
        const actor = m.direction === 'INBOUND' ? 'Cliente' : 'Asesor/IA';
        transcript += `${actor}: ${m.content}\n`;
      }
    }

    if (!transcript.trim()) return { success: false, error: 'No hay conversaciones de texto' };

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `Analiza la siguiente conversación entre un cliente y un asesor/bot de una empresa de corte láser e impresión (Laser Inova).
Genera un resumen estricto en el siguiente formato (Usa Markdown, usa viñetas y sé muy breve).

**Requerimiento Principal:** (Qué quiere el cliente)
**Materiales/Medidas:** (Si aplica)
**Estatus Actual:** (Ej. En espera de diseño, cotización enviada, cliente molesto, etc.)
**Siguiente Paso:** (Qué tiene que hacer el asesor o el cliente ahora)

Conversación:
${transcript}`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return { success: true, summary };
  } catch (error: any) {
    console.error("Error generando resumen:", error);
    return { success: false, error: 'Error al generar resumen' };
  }
}

export async function deleteConversationAction(contactId: string) {
  try {
    await requireAuth();
    if (!contactId || typeof contactId !== 'string') {
      return { success: false, error: 'ID de contacto no válido' };
    }

    await deleteConversationService(contactId);
    revalidatePath('/dashboard/chats');
    return { success: true, data: { id: contactId } };
  } catch (error: any) {
    console.error("Error al eliminar conversación:", error);
    return { success: false, error: error.message || 'Error al eliminar conversación' };
  }
}

export async function clearConversationMessagesAction(contactId: string) {
  try {
    await requireAuth();
    if (!contactId || typeof contactId !== 'string') {
      return { success: false, error: 'ID de contacto no válido' };
    }

    await clearConversationMessagesService(contactId);
    revalidatePath('/dashboard/chats');
    return { success: true, data: { id: contactId } };
  } catch (error: any) {
    console.error("Error al vaciar conversación:", error);
    return { success: false, error: error.message || 'Error al vaciar conversación' };
  }
}


