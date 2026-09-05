import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { notificationEmitter } from '@/lib/notification-emitter';
import { getSecretarySystemPrompt } from '@/lib/agents/secretary/prompt';
import { getRelevantRules } from '@/lib/agents/secretary/knowledge-base';

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
    const buffer = Buffer.from(arrayBuffer);
    
    // 3. Crear directorio si no existe
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'whatsapp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const mimeType = urlData.mime_type;
    let extension = mimeType.split('/')[1]?.split(';')[0] || 'bin';
    
    // Convertir ogg a mp3 si es necesario o dejarlo nativo (WhatsApp usa audio/ogg; codecs=opus)
    if (mimeType.includes('audio/ogg')) {
      extension = 'ogg'; 
    }

    let finalFilename = `${Date.now()}-${mediaId}.${extension}`;
    let finalPath = path.join(uploadDir, finalFilename);

    // 4. Comprimir si es imagen
    if (mimeType.startsWith('image/')) {
      finalFilename = `${Date.now()}-${mediaId}.webp`;
      finalPath = path.join(uploadDir, finalFilename);
      
      await sharp(buffer)
        .webp({ quality: 75 })
        .resize({ width: 1200, withoutEnlargement: true })
        .toFile(finalPath);
    } else {
      // Guardar tal cual (documentos, audios, etc)
      fs.writeFileSync(finalPath, buffer);
    }

    return `/uploads/whatsapp/${finalFilename}`;

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

export async function processAIAgentResponse(contactId: string) {
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
    
    // MODELO 2: "El Chalán" (Calcula cosas si es necesario)
    const chalanModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const historyText = recentMessages.map(msg => `${msg.direction === 'INBOUND' ? 'Cliente' : 'Agente'}: ${msg.content}`).join('\n');
    const chalanPrompt = `Eres "El Chalán", el sistema interno de cálculo de Laser Inova.
Historial reciente:
${historyText}

Analiza el último mensaje del cliente. Si pregunta por costos, precios de maquila o tiempos de entrega, inventa información realista detallada para el simulador.
Si no pide costos, responde estrictamente con: "NO_ACTION_NEEDED".`;

    let chalanContext = "";
    try {
      const chalanResult = await chalanModel.generateContent(chalanPrompt);
      const chalanResponse = chalanResult.response.text().trim();
      if (chalanResponse !== "NO_ACTION_NEEDED") {
        chalanContext = `\n--- INFO DEL CHALÁN ---\n${chalanResponse}\n-------------------------------\n(Usa esta info técnica para informar al cliente sin dar precios finales).`;
      }
    } catch (e) {
      console.warn("Error en El Chalán (ignorado para no afectar al bot principal):", e);
    }

    // Definición de Herramientas (Function Calling)
    const generar_borrador_cotizacion: FunctionDeclaration = {
      name: 'generar_borrador_cotizacion',
      description: 'Guarda los datos del cliente y crea un borrador de cotización. Úsalo SOLO cuando ya extrajiste material, medidas, y cantidad.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          project_name: { type: SchemaType.STRING, description: 'Nombre corto del proyecto (ej. "Termos Grabados", "Corte Acrílico 3mm")' },
          material: { type: SchemaType.STRING, description: 'Material solicitado (ej. MDF, Acrílico, Acero)' },
          grosor: { type: SchemaType.STRING, description: 'Grosor del material si aplica (ej. 3mm)' },
          medidas: { type: SchemaType.STRING, description: 'Dimensiones o medidas (ej. 10x10cm)' },
          cantidad: { type: SchemaType.INTEGER, description: 'Cantidad de piezas solicitadas' },
          diseno_incluido: { type: SchemaType.BOOLEAN, description: 'True si el cliente tiene diseño en vectores, False si no.' },
        },
        required: ['project_name', 'material', 'cantidad'],
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

    // RAG: Inyectar reglas de negocio relevantes al último mensaje
    const lastUserMessage = recentMessages.slice().reverse().find(m => m.direction === 'INBOUND')?.content || "";
    const ragContext = await getRelevantRules(lastUserMessage, genAI);

    const systemInstruction = getSecretarySystemPrompt(clientContext, ragContext);

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash",
      systemInstruction,
      tools: [{ functionDeclarations: [generar_borrador_cotizacion, transferir_a_humano] }]
    });

    // Inyectar contexto del chalán al último mensaje del usuario si existe
    if (chalanContext) {
      for (let i = contents.length - 1; i >= 0; i--) {
        if (contents[i].role === 'user') {
          contents[i].parts[0].text += `\n${chalanContext}`;
          break;
        }
      }
    }

    // Soporte Multimodal: Revisar si el último mensaje del cliente tiene audio/imagen
    const lastClientMessage = recentMessages[recentMessages.length - 1];
    
    if (lastClientMessage && lastClientMessage.direction === 'INBOUND' && lastClientMessage.mediaUrl && ['AUDIO', 'IMAGE'].includes(lastClientMessage.type)) {
      try {
        const filePath = path.join(process.cwd(), 'public', lastClientMessage.mediaUrl);
        if (fs.existsSync(filePath)) {
          const fileData = fs.readFileSync(filePath);
          // Encontrar el último mensaje de usuario en contents y adjuntarle el archivo
          for (let i = contents.length - 1; i >= 0; i--) {
             if (contents[i].role === 'user') {
                contents[i].parts.push({
                  inlineData: {
                    data: fileData.toString('base64'),
                    mimeType: lastClientMessage.mimeType || (lastClientMessage.type === 'AUDIO' ? 'audio/ogg' : 'image/jpeg')
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
      const call = result.response.functionCalls()?.[0];
      
      if (call) {
        if (call.name === 'transferir_a_humano') {
          const args = call.args as any;
          await prisma.whatsAppContact.update({
            where: { id: contact.id },
            data: { botMode: false }
          });
          responseText = `Entiendo, transferiré esta conversación a uno de nuestros asesores para que te atienda personalmente. (Motivo: ${args.motivo})`;
        } else if (call.name === 'generar_borrador_cotizacion') {
          const args = call.args as any;
          
          // Obtener usuario administrador por defecto
          const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }});
          const userId = adminUser?.id || 'dummy-system-user';
          
          // Generar folio
          const date = new Date();
          const yy = date.getFullYear().toString().slice(-2);
          const mm = (date.getMonth() + 1).toString().padStart(2, '0');
          const count = await prisma.quote.count();
          const folio = `COT-${yy}${mm}-${String(count + 1).padStart(4, '0')}`;
          
          // Crear cotización borrador
          await prisma.quote.create({
            data: {
              folio,
              prospectName: contact.name || contact.phone,
              userId,
              project: args.project_name || 'Cotización Web',
              description: `Solicitud Bot WhatsApp:\\nMaterial: ${args.material}\\nGrosor: ${args.grosor || 'N/A'}\\nMedidas: ${args.medidas || 'N/A'}\\nDiseño: ${args.diseno_incluido ? 'Sí' : 'No'}\\nCantidad: ${args.cantidad}`,
              status: 'DRAFT',
              total: 0,
              concepts: {
                create: {
                  conceptType: 'SERVICE',
                  description: `Servicio: ${args.project_name}. Material: ${args.material}. Medidas: ${args.medidas}.`,
                  quantity: args.cantidad || 1,
                }
              }
            }
          });
          
          responseText = `¡Excelente! Ya capturé todos los detalles (Folio #${folio}) y se los pasé a los técnicos para que evalúen el precio final. Te aviso por este medio en cuanto tengan el cálculo.`;
          
          if (ragContext && ragContext.trim().length > 0) {
            const cleanContext = ragContext.replace(/(Datos Bancarios:|Ubicación y Entregas:|Pagos:|Urgencias:|Restricciones de Máquina:)/g, '-');
            responseText += `\n\nPor cierto, respondiendo a lo demás que me preguntaste:\n\n${cleanContext}`;
          }
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
      // Apagamos el botMode porque la IA está fallando por demanda 503
      await prisma.whatsAppContact.update({
        where: { id: contact.id },
        data: { botMode: false }
      });
    }

    // Guardar respuesta en la BD como salida (OUTBOUND)
    const savedMessage = await prisma.whatsAppMessage.create({
      data: {
        contactId: contact.id,
        messageId: `ai_sim_${Date.now()}`,
        direction: 'OUTBOUND',
        type: 'TEXT',
        content: responseText,
        status: 'SENT'
      }
    });

    // Emitir a la UI
    notificationEmitter.emit('whatsapp_message', { message: savedMessage, contact });
    
  } catch (error) {
    console.error("Error en processAIAgentResponse:", error);
  }
}

