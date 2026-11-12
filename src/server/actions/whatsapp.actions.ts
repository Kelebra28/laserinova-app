'use server';
import fs from 'fs';
import path from 'path';

import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendMessageToMeta, listChatContacts, listChatMessages, processAIAgentResponse, retryBotReply, deleteConversationService, clearConversationMessagesService } from '@/server/services/whatsapp.service';
import { notificationEmitter } from '@/lib/notification-emitter';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { executeChalanEstimate } from '@/lib/agents/chalan';
import { revalidatePath } from 'next/cache';
import { META_GRAPH_URL } from '@/constants/urls';
import { SIMULATOR_CONTACT_NAME, isSimulatorContact } from '@/constants/whatsapp';
import { REALTIME_EVENTS } from '@/constants/realtime';

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
    await notificationEmitter.emit(REALTIME_EVENTS.whatsappMessage, { message: pusherMessage, contact });

    // Procesar con IA (debemos hacer await para que Vercel/Next.js no mate el proceso antes de que Gemini responda)
    await processAIAgentResponse(contact.id).catch(console.error);

    return { success: true, message: savedMessage };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error desconocido' };
  }
}


export async function getMessagesAction(contactId: string) {
  await requireAuth();
  return { success: true, data: await listChatMessages(contactId) };
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
  const isSimulationFallback = !metaResponse && (!process.env.WHATSAPP_TOKEN || isSimulatorContact(contact));

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
    await notificationEmitter.emit(REALTIME_EVENTS.whatsappMessage, { message: pusherMessage, contact });
    
    return { success: true, message: savedMessage };
  }

  return { success: false, error: 'No se pudo enviar el mensaje a Meta. Verifica tus tokens.' };
}

export async function retryBotReplyAction(contactId: string) {
  await requireAuth();
  return await retryBotReply(contactId);
}

export async function toggleBotModeAction(contactId: string, botMode: boolean) {
  await requireAuth();
  
  await prisma.whatsAppContact.update({
    where: { id: contactId },
    data: { botMode }
  });

  // Emit event to update UI across all browsers
  await notificationEmitter.emit(REALTIME_EVENTS.whatsappContactUpdate, {
    contactId,
    changes: { botMode }
  });

  return { success: true };
}

export async function createDummyContactAction() {
  await requireAuth();
  
  const dummyContact = await prisma.whatsAppContact.create({
    data: {
      name: SIMULATOR_CONTACT_NAME,
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

        const uploadRes = await fetch(`${META_GRAPH_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`, {
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
    await notificationEmitter.emit(REALTIME_EVENTS.whatsappMessage, { message: pusherMessage, contact });

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

// Datos de una cotización sacados del chat (botón "Calcular"). Mismos campos que le manda el bot al Chalán.
type ManualQuoteData = {
  project_name: string;
  tipo_concepto: string;
  material: string;
  grosor: string;
  ancho_cm: number;
  alto_cm: number;
  cantidad: number;
  diseno_incluido: boolean;
  nombre_cliente: string;
  correo_cliente: string;
  descripcion_concepto: string;
};

/**
 * Botón "Calcular" del chat, paso 1: lee la conversación y saca los datos de la cotización para
 * que el asesor los revise. Sirve cuando el bot no llegó a pedir la cotización (el cliente se
 * desvió con una duda, el bot está apagado, etc.). No guarda nada ni avisa a nadie.
 */
export async function extractQuoteDataAction(contactId: string) {
  try {
    await requireAuth();
    const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } });
    if (!contact) return { success: false as const, error: 'Contacto no encontrado' };

    const empty: ManualQuoteData = {
      project_name: '', tipo_concepto: 'CORTE', material: '', grosor: '', ancho_cm: 0, alto_cm: 0, cantidad: 0,
      diseno_incluido: false, nombre_cliente: contact.name || '', correo_cliente: '', descripcion_concepto: '',
    };

    const messages = await prisma.whatsAppMessage.findMany({
      where: { contactId, direction: { in: ['INBOUND', 'OUTBOUND'] } },
      orderBy: { timestamp: 'desc' },
      take: 60,
      select: { direction: true, type: true, content: true },
    });
    const transcript = messages
      .reverse()
      .map(m => {
        const text = m.content || (m.type === 'IMAGE' ? '[imagen]' : m.type === 'AUDIO' ? '[audio]' : m.type === 'DOCUMENT' ? '[documento]' : '');
        return text ? `${m.direction === 'INBOUND' ? 'Cliente' : 'Asesor/Bot'}: ${text}` : '';
      })
      .filter(Boolean)
      .join('\n');

    const apiKey = process.env.GEMINI_API_KEY;
    // Sin conversación o sin IA: el formulario se abre vacío y el asesor lo llena a mano.
    if (!transcript.trim() || !apiKey) return { success: true as const, data: empty, missing: [] as string[] };

    const str = { type: SchemaType.STRING, nullable: true } as const;
    const num = { type: SchemaType.NUMBER, nullable: true } as const;
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            project_name: str, tipo_concepto: str, material: str, grosor: str,
            ancho_cm: num, alto_cm: num, cantidad: num,
            diseno_incluido: { type: SchemaType.BOOLEAN, nullable: true },
            nombre_cliente: str, correo_cliente: str, descripcion_concepto: str,
          },
        },
      },
    });

    const result = await model.generateContent(`Eres asistente de Laser Inova (taller de corte y grabado láser e impresión UV). Lee la conversación de WhatsApp y extrae los datos del trabajo que el cliente quiere cotizar. Si hablaron de varios trabajos, toma el más reciente.

Reglas:
- NO inventes nada. Si un dato no aparece en la conversación, devuélvelo como null.
- project_name: nombre corto del proyecto (ej. "Placas de acrílico", "Termos grabados").
- tipo_concepto: "CORTE" o "GRABADO" si es trabajo en material suelto; "REVENTA" si es un producto de catálogo (termos, plumas, libretas).
- material: el material sin el grosor (ej. "Acrílico cristal", "MDF"). grosor aparte (ej. "3mm").
- ancho_cm y alto_cm: medidas de UNA pieza en centímetros (convierte si vienen en mm, m o pulgadas). Si es circular, ancho y alto son el diámetro.
- cantidad: número de piezas.
- diseno_incluido: true si el cliente dijo que ya tiene su diseño o archivo; false si dijo que no; null si no se habló.
- nombre_cliente y correo_cliente: solo si el cliente los escribió.
- descripcion_concepto: una frase con el detalle del trabajo (forma, acabado, grabado, orificios, etc.).

Conversación:
${transcript}`);

    if (result.response.usageMetadata) {
      const inputTokens = result.response.usageMetadata.promptTokenCount || 0;
      const outputTokens = result.response.usageMetadata.candidatesTokenCount || 0;
      await prisma.aiUsageLog.create({
        data: {
          agentName: 'Calcular (chat)', contactId, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens,
          estimatedCost: (inputTokens * 0.075) / 1000000 + (outputTokens * 0.3) / 1000000,
        },
      }).catch((e) => console.error('Fallo al guardar tokens de Calcular:', e));
    }

    const raw = JSON.parse(result.response.text() || '{}') as Record<string, unknown>;
    const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const positive = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
    const tipo = text(raw.tipo_concepto).toUpperCase();
    const data: ManualQuoteData = {
      project_name: text(raw.project_name),
      tipo_concepto: ['CORTE', 'GRABADO', 'REVENTA'].includes(tipo) ? tipo : 'CORTE',
      material: text(raw.material),
      grosor: text(raw.grosor),
      ancho_cm: positive(raw.ancho_cm),
      alto_cm: positive(raw.alto_cm),
      cantidad: Math.round(positive(raw.cantidad)),
      diseno_incluido: raw.diseno_incluido === true,
      nombre_cliente: text(raw.nombre_cliente) || contact.name || '',
      correo_cliente: text(raw.correo_cliente),
      descripcion_concepto: text(raw.descripcion_concepto),
    };

    // Lo que el asesor tiene que completar antes de calcular.
    const missing = ([
      ['project_name', 'proyecto'], ['material', 'material'], ['ancho_cm', 'ancho'], ['alto_cm', 'alto'], ['cantidad', 'cantidad'],
    ] as const).filter(([key]) => !data[key]).map(([, label]) => label);

    return { success: true as const, data, missing };
  } catch (error) {
    console.error('Error extrayendo datos de cotización del chat:', error);
    return { success: false as const, error: 'No se pudieron leer los datos de la conversación.' };
  }
}

/**
 * Botón "Calcular" del chat, paso 2: corre el mismo cálculo del Chalán con los datos que confirmó
 * el asesor y deja la nota de estimación en el chat (la que habilita "Generar cotización").
 * No se avisa al administrador: quien lo pide ya está viendo el chat.
 */
export async function runManualEstimateAction(contactId: string, input: ManualQuoteData) {
  try {
    await requireAuth();
    const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } });
    if (!contact) return { success: false as const, error: 'Contacto no encontrado' };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { success: false as const, error: 'Falta configurar GEMINI_API_KEY.' };

    const tipo = ['CORTE', 'GRABADO', 'REVENTA'].includes(input.tipo_concepto) ? input.tipo_concepto : 'CORTE';
    const data = {
      project_name: String(input.project_name || '').trim(),
      material: String(input.material || '').trim(),
      grosor: String(input.grosor || '').trim() || undefined,
      ancho_cm: Number(input.ancho_cm) || 0,
      alto_cm: Number(input.alto_cm) || 0,
      cantidad: Math.round(Number(input.cantidad) || 0),
      diseno_incluido: !!input.diseno_incluido,
      nombre_cliente: String(input.nombre_cliente || '').trim() || contact.name || '',
      correo_cliente: String(input.correo_cliente || '').trim(),
      tipo_concepto: tipo,
      descripcion_concepto: String(input.descripcion_concepto || '').trim(),
    };
    if (!data.project_name || !data.material) return { success: false as const, error: 'Faltan el proyecto y el material.' };
    if (data.cantidad <= 0) return { success: false as const, error: 'La cantidad debe ser mayor a cero.' };
    if (tipo !== 'REVENTA' && (data.ancho_cm <= 0 || data.alto_cm <= 0)) {
      return { success: false as const, error: 'Faltan las medidas (ancho y alto en cm).' };
    }

    const chalanResult = await executeChalanEstimate(data, contact, new GoogleGenerativeAI(apiKey));

    const message = await prisma.whatsAppMessage.create({
      data: {
        contactId,
        messageId: `chalan_manual_${Date.now()}`,
        direction: 'INTERNAL',
        type: 'TEXT',
        content: `Estimación del Chalán:\n${chalanResult.cleanEstimate}\n${chalanResult.quotePayload}`,
        status: 'DELIVERED',
      },
    });
    await notificationEmitter.emit(REALTIME_EVENTS.whatsappMessage, { message, contact });

    return { success: true as const, message };
  } catch (error) {
    console.error('Error calculando la estimación manual:', error);
    return { success: false as const, error: 'No se pudo calcular la estimación.' };
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



/** Lista de contactos con su último mensaje, para resincronizar el chat al volver a la app. */
export async function getContactsAction() {
  await requireAuth();
  return { success: true, data: await listChatContacts() };
}

