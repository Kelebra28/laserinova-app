'use server';
import fs from 'fs';
import path from 'path';

import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendMessageToMeta, processAIAgentResponse } from '@/server/services/whatsapp.service';
import { notificationEmitter } from '@/lib/notification-emitter';

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
    notificationEmitter.emit('whatsapp_message', { message: savedMessage, contact });

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
    orderBy: { timestamp: 'asc' }
  });

  return { success: true, data: messages };
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
    notificationEmitter.emit('whatsapp_message', { message: savedMessage, contact });
    
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

    if (!file || !contactId) return { success: false, error: 'Faltan datos' };

    const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } });
    if (!contact) return { success: false, error: 'Contacto no encontrado' };

    // 1. Guardar archivo localmente
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'whatsapp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Simplificado para el simulador: guardar con su nombre original saneado
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const finalFilename = `${Date.now()}-${safeName}`;
    const finalPath = path.join(uploadDir, finalFilename);
    
    fs.writeFileSync(finalPath, buffer);
    const mediaUrl = `/uploads/whatsapp/${finalFilename}`;

    // Determinar tipo
    let type = 'DOCUMENT';
    if (file.type.startsWith('image/')) type = 'IMAGE';
    else if (file.type.startsWith('audio/')) type = 'AUDIO';
    else if (file.type.startsWith('video/')) type = 'VIDEO';

    // 2. Determinar si es simulador (INBOUND) o flujo normal (OUTBOUND)
    const direction = isSimulator ? 'INBOUND' : 'OUTBOUND';
    const fakeMessageId = `media_${Date.now()}`;

    // 3. Crear en BD
    const savedMessage = await prisma.whatsAppMessage.create({
      data: {
        contactId: contact.id,
        messageId: fakeMessageId,
        direction,
        type,
        content: isSimulator ? file.name : (type === 'IMAGE' ? '📷 Imagen adjunta' : '📄 Archivo adjunto'),
        mediaUrl,
        mimeType: file.type,
        status: isSimulator ? 'DELIVERED' : (process.env.WHATSAPP_TOKEN ? 'SENT' : 'SENT_LOCAL_SIMULATION')
      }
    });

    notificationEmitter.emit('whatsapp_message', { message: savedMessage, contact });

    // 4. Si es simulador (cliente envía), procesar con IA
    if (isSimulator) {
      processAIAgentResponse(contact.id).catch(console.error);
    } else if (contact.botMode) {
      // Si el agente manda algo manual, se apaga el bot
      await toggleBotModeAction(contact.id, false);
    }

    return { success: true, message: savedMessage };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al procesar archivo' };
  }
}


