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
    
    let mimeType = urlData.mime_type;
    
    // 3. Comprimir si es imagen o guardar en Base64
    if (mimeType.startsWith('image/')) {
      const optimizedBuffer = await sharp(buffer)
        .webp({ quality: 75 })
        .resize({ width: 1200, withoutEnlargement: true })
        .toBuffer();
      
      return `data:image/webp;base64,${optimizedBuffer.toString('base64')}`;
    } else {
      // Audio o Documentos: WhatsApp usa audio/ogg; codecs=opus.
      if (mimeType.includes('audio/ogg')) {
        mimeType = 'audio/ogg'; // Limpiar codecs=opus para compatibilidad web
      }
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    }

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

  // Si es el simulador local, espera 4 segundos para ser rápido.
  // Si es WhatsApp real, espera 2 minutos (120000 ms) para asegurar que el cliente termine.
  const isSimulator = !process.env.WHATSAPP_TOKEN || (contact.name && contact.name.includes("Simulador"));
  const delayMs = isSimulator ? 4000 : 120000;

  // Set a new timer to wait before processing
  const timer = setTimeout(() => {
    aiProcessingTimers.delete(contactId);
    executeAIAgentResponse(contactId).catch(console.error);
  }, delayMs);

  aiProcessingTimers.set(contactId, timer);
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

    // RAG: Inyectar reglas de negocio relevantes al último mensaje
    const lastUserMessage = recentMessages.slice().reverse().find(m => m.direction === 'INBOUND')?.content || "";
    const ragContext = await getRelevantRules(lastUserMessage, genAI);

    const systemInstruction = getSecretarySystemPrompt(clientContext, ragContext);

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction,
      tools: [{ functionDeclarations: [notificar_solicitud_cotizacion, transferir_a_humano] }]
    });



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
        } else if (call.name === 'notificar_solicitud_cotizacion') {
          const args = call.args as any;
          
          // Obtener lista de precios reales de la BD
          let productListContext = "";
          let materialListContext = "";
          let machineCostMin = 0.70; // Fallback

          try {
            const products = await prisma.product.findMany({
              where: { active: true },
              select: { name: true, unitPrice: true }
            });
            if (products.length > 0) {
              productListContext = products.map(p => `- ${p.name}: $${p.unitPrice} MXN`).join('\n');
            }

            const materials = await prisma.material.findMany({
              select: { name: true, pricePerCm2: true, sheetPrice: true, length: true, width: true }
            });
            if (materials.length > 0) {
              materialListContext = materials.map(m => {
                let costArea = m.pricePerCm2 || 0;
                if (!costArea && m.sheetPrice && m.length && m.width) {
                  costArea = m.sheetPrice / (m.length * m.width);
                }
                // Añadirle el 20% de transporte y 20% de merma (simplificado a factor 1.44 para el estimado bruto)
                const costFinal = (costArea * 1.44).toFixed(4);
                return `- ${m.name}: $${costFinal} MXN por cm2 (ya incluye transporte y merma)`;
              }).join('\n');
            }

            const costConfigs = await prisma.costConfiguration.findMany();
            let tubePrice = 250000;
            let tubeLife = 6000;
            costConfigs.forEach(c => {
              if (c.key === 'precio_tubo') tubePrice = c.value;
              if (c.key === 'vida_util_tubo') tubeLife = c.value;
            });
            machineCostMin = (tubePrice / tubeLife) / 60;
          } catch(e) {}

          // 1. Invocar al Chalán AHORA que ya tenemos toda la info, para que haga el cálculo interno
          let chalanEstimate = "No se pudo calcular el estimado.";
          try {
            const chalanModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const chalanPrompt = `Eres "El Chalán", el calculista interno de Laser Inova. La secretaria recopiló esta información del cliente:
Proyecto: ${args.project_name}
Material: ${args.material}
Grosor: ${args.grosor || 'N/A'}
Ancho: ${args.ancho_cm} cm
Alto: ${args.alto_cm} cm
Cantidad: ${args.cantidad}
Diseño: ${args.diseno_incluido ? 'Sí' : 'No'}

**CATÁLOGO DE PRODUCTOS (Para Reventa/Grabado de Producto):**
${productListContext || "No disponible"}

**CATÁLOGO DE MATERIALES (Para Corte/Grabado desde cero):**
${materialListContext || "No disponible"}

**COSTO DE MÁQUINA LÁSER:**
$${machineCostMin.toFixed(2)} MXN por Minuto.

REGLA CRÍTICA DE CÁLCULO: TIENES ESTRICTAMENTE PROHIBIDO INVENTAR PRECIOS.
Debes usar ÚNICAMENTE los catálogos provistos arriba.
1. Calcula el Área de la pieza (Ancho x Alto).
2. Costo Material = Área x (Costo por cm2 del material más similar). Si no lo encuentras, usa $0.05.
3. Costo Máquina = (Minutos estimados) x (Costo por Minuto). Para grabados/cortes promedio, estima 1 a 3 minutos por pieza de 10x10.
4. Costo Total = Costo Material + Costo Máquina.
5. El "TOTAL ESTIMADO" de venta al público debe ser aprox el (Costo Total x 2).

REGLAS ESTRICTAS DE FORMATO:
1. DEBES iniciar tu respuesta EXACTAMENTE con la palabra "Jefe" (sin saludos extra).
2. NO uses párrafos, explicaciones largas ni hables. Solo devuelve datos crudos en una lista de viñetas.
3. Al FINAL de tu mensaje, DEBES incluir un bloque de datos técnicos en formato JSON envuelto exactamente entre las etiquetas ||JSON|| ... ||JSON|| con el tiempo de máquina estimado por cada 1 pieza (en minutos).

Ejemplo exacto del formato que debes usar:
Jefe
- Área por pieza: X cm2
- Costo Material: $X MXN
- Costo Corte/Grabado: $X MXN
- Costo Diseño: $X MXN
- TOTAL ESTIMADO: $X - $Y MXN
||JSON||
{"estimatedTimeMin": 1.5}
||JSON||`;

            const chalanResult = await chalanModel.generateContent(chalanPrompt);
            chalanEstimate = chalanResult.response.text().trim();
            
            // Log tokens for Chalan
            if (chalanResult.response.usageMetadata) {
              const inputTokens = chalanResult.response.usageMetadata.promptTokenCount || 0;
              const outputTokens = chalanResult.response.usageMetadata.candidatesTokenCount || 0;
              const estimatedCost = (inputTokens * 0.075 / 1000000) + (outputTokens * 0.30 / 1000000);
              await prisma.aiUsageLog.create({
                data: {
                  agentName: "El Chalán",
                  contactId: contact.id,
                  inputTokens,
                  outputTokens,
                  totalTokens: inputTokens + outputTokens,
                  estimatedCost,
                }
              });
            }
          } catch (e) {
            console.error("Error en estimación final del Chalán:", e);
          }

          // Procesar el mensaje del chalán para extraer el JSON oculto y limpiar el texto
          let cleanChalanEstimate = chalanEstimate;
          let parsedChalanData: any = {};
          
          if (chalanEstimate.includes("||JSON||")) {
            const parts = chalanEstimate.split("||JSON||");
            cleanChalanEstimate = parts[0].trim();
            try {
              if (parts[1]) {
                parsedChalanData = JSON.parse(parts[1].trim());
              }
            } catch(e) {
              console.error("Error parseando JSON del Chalán:", e);
            }
          }

          const adminAlertMsg = `🚨 *Nueva Solicitud de Cotización* 🚨
Cliente: ${contact.name || contact.phone} (${contact.phone})
Proyecto: ${args.project_name}
Material: ${args.material}
Grosor: ${args.grosor || 'N/A'}
Ancho: ${args.ancho_cm} cm
Alto: ${args.alto_cm} cm
Cantidad: ${args.cantidad}
Diseño: ${args.diseno_incluido ? 'Sí' : 'No'}

🤖 *Estimación Previa del Chalán (IA):*
${cleanChalanEstimate}

_Para responder, busca este cliente en el CRM o comunícate con él directamente._`;

          // Guardar el mensaje interno del Chalán en la BD para que se vea en el UI del chat
          try {
            const fullMaterialName = args.grosor ? `${args.material} ${args.grosor}` : args.material;
            const quoteData = {
              project: args.project_name,
              material: fullMaterialName,
              width: args.ancho_cm,
              height: args.alto_cm,
              qty: args.cantidad,
              estimatedTimeMin: parsedChalanData.estimatedTimeMin || "",
              name: args.nombre_cliente || "",
              email: args.correo_cliente || ""
            };
            const payload = `|||${encodeURIComponent(JSON.stringify(quoteData))}|||`;

            const internalMessage = await prisma.whatsAppMessage.create({
              data: {
                contactId: contact.id,
                messageId: `chalan_${Date.now()}`,
                direction: 'INTERNAL',
                type: 'TEXT',
                content: `Estimación del Chalán:\n${cleanChalanEstimate}\n${payload}`,
                status: 'DELIVERED'
              }
            });
            // Emitir evento para el UI
            notificationEmitter.emit('whatsapp_message', { message: internalMessage, contact });
          } catch(e) {}

          // Alertar al admin (si falla, no rompas el flujo de la IA)
          try {
            if (!contact.name?.includes("Simulador")) {
              await sendMessageToMeta('52XXXXXXXXXX', {
                type: 'text',
                text: { body: adminAlertMsg }
              });
            } else {
              console.log("[SIMULADOR] Alerta de cotización al admin simulada:", adminAlertMsg);
            }
          } catch (e) {
            console.warn("No se pudo enviar la alerta al admin (quizás token vencido):", e);
          }
          
          responseText = `¡Excelente! Ya capturé todos los detalles y se los pasé al taller. En un momento un asesor revisará la información y te enviará la cotización por este medio.`;
          
          if (ragContext && ragContext.trim().length > 0) {
            const cleanContext = ragContext.replace(/(Datos Bancarios:|Ubicación y Entregas:|Pagos:|Urgencias:|Restricciones de Máquina:)/g, '-');
            responseText += `\n\nPor cierto, respondiendo a lo demás que me preguntaste:\n\n${cleanContext}`;
          }
        }
      } else {
        responseText = result.response.text();
      }

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

    // Emitir a la UI
    notificationEmitter.emit('whatsapp_message', { message: savedMessage, contact });
    
  } catch (error) {
    console.error("Error en processAIAgentResponse:", error);
  }
}

