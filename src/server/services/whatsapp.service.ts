import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { notificationEmitter } from '@/lib/notification-emitter';
import { getSecretarySystemPrompt } from '@/lib/agents/secretary/prompt';
import { getRelevantRules } from '@/lib/agents/secretary/knowledge-base';
import { executeChalanEstimate } from '@/lib/agents/chalan';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export async function sendMessageToMeta(to: string, messageData: any) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error("Faltan variables de entorno para WhatsApp API");
    return null;
  }

  const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      ...messageData
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Error enviando mensaje a Meta:', data);
    throw new Error(data.error?.message || 'Error desconocido al enviar mensaje');
  }

  return data;
}

export async function downloadAndCompressMedia(mediaId: string): Promise<string | null> {
  if (!WHATSAPP_TOKEN) return null;

  try {
    const { mkdir, writeFile } = await import('fs/promises');
    const { join } = await import('path');
    
    // 1. Obtener la URL del media
    const urlResponse = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
    });
    const urlData = await urlResponse.json();
    
    if (!urlData.url) throw new Error('No se pudo obtener la URL del media');

    // 2. Descargar el archivo
    const mediaResponse = await fetch(urlData.url, {
      headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
    });
    
    const arrayBuffer = await mediaResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer);
    
    let mimeType = urlData.mime_type;
    let folder = 'docs';
    let extension = 'bin';
    let finalBuffer = buffer;
    
    // 3. Categorizar y comprimir
    if (mimeType.startsWith('image/')) {
      folder = 'images';
      extension = 'webp';
      finalBuffer = await sharp(buffer)
        .webp({ quality: 80 })
        .resize({ width: 1200, withoutEnlargement: true })
        .toBuffer();
    } else if (mimeType.includes('audio/')) {
      folder = 'audio';
      extension = 'ogg'; // WhatsApp usa ogg
    } else if (mimeType.includes('video/')) {
      folder = 'video';
      extension = 'mp4';
    } else if (mimeType.includes('pdf')) {
      extension = 'pdf';
    }

    // 4. Guardar físicamente en Hostinger (public/uploads)
    const uploadDir = join(process.cwd(), 'public', 'uploads', folder);
    await mkdir(uploadDir, { recursive: true });

    const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = `${uniqueId}.${extension}`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, finalBuffer);

    // 5. Retornar solo el enlace público a la BD
    return `/uploads/${folder}/${fileName}`;

  } catch (error) {
    console.error('Error procesando media:', error);
    return null;
  }
}

export async function processIncomingMessage(entry: any) {
  const changes = entry.changes?.[0]?.value;
  if (!changes) return null;

  const metadata = changes.metadata;
  const messages = changes.messages;
  const contacts = changes.contacts;

  // Manejar estado de mensajes (leído, entregado)
  if (changes.statuses && changes.statuses.length > 0) {
    const statusObj = changes.statuses[0];
    await prisma.whatsAppMessage.updateMany({
      where: { messageId: statusObj.id },
      data: { status: statusObj.status.toUpperCase() }
    });
    return { type: 'status', data: statusObj };
  }

  if (!messages || messages.length === 0) return null;

  const msg = messages[0];
  const senderPhone = msg.from;
  const senderProfileName = contacts?.[0]?.profile?.name || "Desconocido";

  // Buscar o crear contacto
  let contact = await prisma.whatsAppContact.findUnique({
    where: { phone: senderPhone }
  });

  if (!contact) {
    contact = await prisma.whatsAppContact.create({
      data: {
        phone: senderPhone,
        name: senderProfileName,
        botMode: true,
      }
    });
  }

  // Comprobar si el mensaje ya fue procesado
  const existingMsg = await prisma.whatsAppMessage.findUnique({
    where: { messageId: msg.id }
  });
  
  if (existingMsg) return null;

  let messageContent = '';
  let mediaUrl = null;
  let mimeType = null;
  let type = 'TEXT';

  if (msg.type === 'text') {
    messageContent = msg.text.body;
  } else if (['image', 'document', 'audio', 'voice'].includes(msg.type)) {
    const mediaObj = msg[msg.type];
    type = msg.type.toUpperCase();
    if (type === 'VOICE') type = 'AUDIO'; // Normalizar
    
    mediaUrl = await downloadAndCompressMedia(mediaObj.id);
    mimeType = mediaObj.mime_type;
    
    if (msg.type === 'document') {
      messageContent = mediaObj.filename || 'Documento adjunto';
    }
  }

  const savedMessage = await prisma.whatsAppMessage.create({
    data: {
      contactId: contact.id,
      messageId: msg.id,
      direction: 'INBOUND',
      type: type,
      content: messageContent,
      mediaUrl: mediaUrl,
      mimeType: mimeType,
      status: 'DELIVERED',
      timestamp: new Date(parseInt(msg.timestamp) * 1000)
    }
  });

  return { type: 'message', message: savedMessage, contact };
}

const aiProcessingTimers = new Map<string, NodeJS.Timeout>();

export async function processAIAgentResponse(contactId: string) {
  // Clear any existing timer for this contact
  if (aiProcessingTimers.has(contactId)) {
    clearTimeout(aiProcessingTimers.get(contactId)!);
  }

  // Fetch contact to know if it's a simulator or real case
  const contact = await prisma.whatsAppContact.findUnique({
    where: { id: contactId }
  });
  
  if (!contact) return;

  // En Vercel (Serverless), los "setTimeout" no funcionan porque el servidor se congela
  // en cuanto se devuelve la respuesta HTTP. 
  // Por lo tanto, debemos ejecutar la IA INMEDIATAMENTE y usar await.
  return await executeAIAgentResponse(contactId).catch(console.error);
}

async function executeAIAgentResponse(contactId: string) {
  try {
    const contact = await prisma.whatsAppContact.findUnique({
      where: { id: contactId }
    });

    if (!contact || !contact.botMode) return; // Si el bot no está activo, ignorar.

    // Traemos los últimos 12 mensajes (descendente) y los invertimos para orden cronológico (ascendente)
    const recentMessagesDesc = await prisma.whatsAppMessage.findMany({
      where: { contactId },
      orderBy: { timestamp: 'desc' },
      take: 12
    });
    const recentMessages = recentMessagesDesc.reverse();

    // Construir el historial (Gemini exige que los roles 'user' y 'model' se alternen estrictamente)
    const contents: any[] = [];
    recentMessages.forEach(msg => {
      const role = msg.direction === 'INBOUND' ? 'user' : 'model';
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += `\n${msg.content}`;
      } else {
        contents.push({ role, parts: [{ text: msg.content }] });
      }
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("No hay GEMINI_API_KEY configurada.");
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Definición de Herramientas (Function Calling)
    const notificar_solicitud_cotizacion: FunctionDeclaration = {
      name: 'notificar_solicitud_cotizacion',
      description: 'Envía los datos recolectados al administrador humano para que autorice y genere la cotización final. IMPORTANTE: NO puedes usar esta herramienta hasta que le hayas preguntado al cliente y tengas TODOS los siguientes datos obligatorios: Material, Ancho, Alto, Cantidad y Nombre del Cliente. Si falta algo, pregúntale al cliente antes de llamar a esta función.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          project_name: { type: SchemaType.STRING, description: 'Nombre corto del proyecto (ej. "Termos Grabados", "Corte Acrílico")' },
          material: { type: SchemaType.STRING, description: 'Material solicitado por el cliente (Obligatorio)' },
          grosor: { type: SchemaType.STRING, description: 'Grosor del material si aplica (ej. 3mm)' },
          ancho_cm: { type: SchemaType.NUMBER, description: 'Medida del ANCHO en centímetros exactos (Obligatorio)' },
          alto_cm: { type: SchemaType.NUMBER, description: 'Medida del ALTO en centímetros exactos (Obligatorio)' },
          cantidad: { type: SchemaType.INTEGER, description: 'Cantidad de piezas solicitadas por el cliente (Obligatorio)' },
          diseno_incluido: { type: SchemaType.BOOLEAN, description: 'True si el cliente tiene diseño en vectores, False si no.' },
          nombre_cliente: { type: SchemaType.STRING, description: 'Nombre de la persona con la que estás hablando (Obligatorio)' },
          correo_cliente: { type: SchemaType.STRING, description: 'Correo electrónico del cliente (Opcional, puede venir vacío)' },
        },
        required: ['project_name', 'material', 'ancho_cm', 'alto_cm', 'cantidad', 'nombre_cliente'],
      }
    };

    const transferir_a_humano: FunctionDeclaration = {
      name: 'transferir_a_humano',
      description: 'Transfiere a un humano si el cliente se enoja, pide a un humano, o hace preguntas técnicas muy complejas.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: { motivo: { type: SchemaType.STRING, description: 'Motivo de la transferencia' } },
        required: ['motivo'],
      }
    };

    let clientContext = "";
    if (contact.clientId) {
      const recentQuotes = await prisma.quote.findMany({
        where: { clientId: contact.clientId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { folio: true, project: true, status: true, total: true, createdAt: true }
      });
      if (recentQuotes.length > 0) {
        clientContext = recentQuotes.map(q => 
          `- Folio: ${q.folio}, Proyecto: "${q.project}", Estado: ${q.status}, Total: $${q.total.toFixed(2)}, Fecha: ${q.createdAt.toLocaleDateString()}`
        ).join('\\n');
      }
    }

    const hasRequestedQuote = recentMessages.some(m => m.direction === 'INTERNAL' && m.content?.includes('Estimación del Chalán'));
    
    // RAG: Inyectar reglas de negocio relevantes al último mensaje
    const lastUserMessage = recentMessages.slice().reverse().find(m => m.direction === 'INBOUND')?.content || "";
    const ragContext = await getRelevantRules(lastUserMessage, genAI);

    const systemInstruction = getSecretarySystemPrompt(clientContext, ragContext, hasRequestedQuote);

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash",
      systemInstruction,
      tools: [{ functionDeclarations: [notificar_solicitud_cotizacion, transferir_a_humano] }]
    });



    // Soporte Multimodal: Revisar si el último mensaje del cliente tiene audio/imagen
    const lastClientMessage = recentMessages[recentMessages.length - 1];
    
    if (lastClientMessage && lastClientMessage.direction === 'INBOUND' && lastClientMessage.mediaUrl && ['AUDIO', 'IMAGE'].includes(lastClientMessage.type)) {
      try {
        let base64Data: string | null = null;
        let mimeType = lastClientMessage.mimeType || (lastClientMessage.type === 'AUDIO' ? 'audio/ogg' : 'image/jpeg');

        if (lastClientMessage.mediaUrl.startsWith('data:')) {
          // Formato Base64: "data:audio/ogg;base64,XXXX..."
          const match = lastClientMessage.mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            base64Data = match[2];
          }
        } else {
          // Fallback: archivo en disco (legacy)
          const filePath = path.join(process.cwd(), 'public', lastClientMessage.mediaUrl);
          if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath);
            base64Data = fileData.toString('base64');
          }
        }

        if (base64Data) {
          // Encontrar el último mensaje de usuario en contents y adjuntarle el archivo
          for (let i = contents.length - 1; i >= 0; i--) {
            if (contents[i].role === 'user') {
              contents[i].parts.push({
                inlineData: {
                  data: base64Data,
                  mimeType
                }
              });
              break;
            }
          }
        }
      } catch (e) {
        console.error("Error adjuntando media a Gemini:", e);
      }
    }

    let responseText = "";

    try {
      const result = await model.generateContent({ contents });
      
      // REGISTRAR TOKENS INMEDIATAMENTE ANTES DE QUE ALGO MÁS PUEDA FALLAR
      try {
        if (result.response.usageMetadata) {
          const inputTokens = result.response.usageMetadata.promptTokenCount || 0;
          const outputTokens = result.response.usageMetadata.candidatesTokenCount || 0;
          const estimatedCost = (inputTokens * 0.075 / 1000000) + (outputTokens * 0.30 / 1000000);
          await prisma.aiUsageLog.create({
            data: {
              agentName: "Secretary",
              contactId: contact.id,
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
              estimatedCost,
            }
          });
        }
      } catch (logError) {
        console.error("Fallo al guardar tokens de Secretary:", logError);
      }

      const call = result.response.functionCalls()?.[0];
      
      if (call) {
        if (call.name === 'transferir_a_humano') {
          const args = call.args as any;
          await prisma.whatsAppContact.update({
            where: { id: contact.id },
            data: { botMode: false }
          });
          
          notificationEmitter.emit('whatsapp_contact_update', {
            contactId: contact.id,
            changes: { botMode: false }
          });

          responseText = `Entiendo, transferiré esta conversación a uno de nuestros asesores para que te atienda personalmente. (Motivo: ${args.motivo})`;
        } else if (call.name === 'notificar_solicitud_cotizacion') {
          const args = call.args as any;

          // 1. Invocar a El Chalán de forma modular (con catálogos y Pinecone)
          const chalanResult = await executeChalanEstimate(
            {
              project_name: args.project_name,
              material: args.material,
              grosor: args.grosor,
              ancho_cm: args.ancho_cm,
              alto_cm: args.alto_cm,
              cantidad: args.cantidad,
              diseno_incluido: args.diseno_incluido,
              nombre_cliente: args.nombre_cliente,
              correo_cliente: args.correo_cliente,
            },
            contact,
            genAI
          );

          // 2. Guardar el mensaje interno del Chalán en la BD para que se vea en el UI del chat
          try {
            const internalMessage = await prisma.whatsAppMessage.create({
              data: {
                contactId: contact.id,
                messageId: `chalan_${Date.now()}`,
                direction: 'INTERNAL',
                type: 'TEXT',
                content: `Estimación del Chalán:\n${chalanResult.cleanEstimate}\n${chalanResult.quotePayload}`,
                status: 'DELIVERED',
              },
            });
            // Emitir evento para el UI
            notificationEmitter.emit('whatsapp_message', { message: internalMessage, contact });
          } catch (e) {
            console.error("Error guardando mensaje interno de El Chalán:", e);
          }

          // 3. Alertar al admin (si falla, no rompas el flujo de la IA)
          try {
            if (!contact.name?.includes("Simulador")) {
              await sendMessageToMeta('52XXXXXXXXXX', {
                type: 'text',
                text: { body: chalanResult.adminAlertMsg },
              });
            } else {
              console.log("[SIMULADOR] Alerta de cotización al admin simulada:", chalanResult.adminAlertMsg);
            }
          } catch (e) {
            console.warn("No se pudo enviar la alerta al admin (quizás token vencido):", e);
          }
          
          responseText = `¡Excelente! Ya capturé todos los detalles y se los pasé al taller. En un momento un asesor revisará la información y te enviará la cotización por este medio.`;
        }
      } else {
        responseText = result.response.text();
      }

      if (!responseText) {
        responseText = "Entendido. ¿Puedo ayudarte con algo más?";
      }
    } catch (error: any) {
      console.error("Error crítico en Gemini (main):", error);
      responseText = "Disculpa, nuestro sistema automático está experimentando intermitencias técnicas. En un momento un asesor humano retomará tu conversación.";
      // Ya no apagamos el bot para que no se quede mudo por fallos temporales
      // await prisma.whatsAppContact.update({
      //   where: { id: contact.id },
      //   data: { botMode: false }
      // });
    }

    // Enviar el mensaje físico por WhatsApp
    let metaMessageId = `ai_sim_${Date.now()}`;
    try {
      if (!contact.name?.includes("Simulador")) {
        const metaRes = await sendMessageToMeta(contact.phone, {
          type: 'text',
          text: { body: responseText }
        });
        if (metaRes?.messages?.[0]?.id) {
          metaMessageId = metaRes.messages[0].id;
        }
      }
    } catch (e) {
      console.error("Error enviando WhatsApp al cliente:", e);
    }

    // Guardar respuesta en la BD como salida (OUTBOUND)
    const savedMessage = await prisma.whatsAppMessage.create({
      data: {
        contactId: contact.id,
        messageId: metaMessageId,
        direction: 'OUTBOUND',
        type: 'TEXT',
        content: responseText,
        status: 'SENT'
      }
    });

    const pusherMessage = { ...savedMessage };
    if (pusherMessage.mediaUrl && pusherMessage.mediaUrl.length > 5000) {
      pusherMessage.mediaUrl = 'FETCH_REQUIRED';
    }
    notificationEmitter.emit('whatsapp_message', { message: pusherMessage, contact });
    
  } catch (error) {
    console.error("Error en processAIAgentResponse:", error);
  }
}

