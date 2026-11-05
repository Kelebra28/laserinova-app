import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { notificationEmitter } from '@/lib/notification-emitter';
import { getSecretarySystemPrompt } from '@/lib/agents/secretary/prompt';
import { getRelevantRules } from '@/lib/agents/secretary/knowledge-base';
import { executeChalanEstimate } from '@/lib/agents/chalan';
import { sendPushToAdmins } from '@/lib/push';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export async function sendMessageToMeta(to: string, messageData: any) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error("Faltan variables de entorno para WhatsApp API");
    return null;
  }

  const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

  // Meta entrega los números de México como 521XXXXXXXXXX, pero la lista de destinatarios
  // (y el formato oficial actual) usa 52XXXXXXXXXX. Sin esto responde #131030.
  const normalizedTo = to.replace(/^521(\d{10})$/, '52$1');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizedTo,
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

/** Sube un documento (ej. PDF de cotización) a Meta y lo manda al número; devuelve el id del mensaje. */
export async function sendDocumentToMeta(to: string, buffer: Buffer, filename: string, caption?: string, mimeType = 'application/pdf') {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) throw new Error('Faltan variables de entorno para WhatsApp API');

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);
  form.append('type', mimeType);
  form.append('messaging_product', 'whatsapp');

  const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    body: form,
  });
  const upload = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(upload.error?.message || 'Error subiendo el PDF a Meta');

  const sent = await sendMessageToMeta(to, {
    type: 'document',
    document: { id: upload.id, filename, ...(caption ? { caption } : {}) },
  });
  return (sent?.messages?.[0]?.id as string | undefined) ?? null;
}

/** Ruta relativa del chat (para push: abre en el mismo origen de la PWA instalada). */
function conversationPath(contactId: string) {
  return `/dashboard/chats?c=${contactId}`;
}

/** Enlace que abre la conversación dentro del CRM (la PWA instalada lo captura en Android). */
function conversationLink(contactId: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://app.laserinova.com').replace(/\/$/, '');
  return `${base}/dashboard/chats?c=${contactId}`;
}

/** Resumen corto de la conversación para el aviso al administrador; si falla devuelve null. */
async function quickConversationSummary(contactId: string): Promise<string | null> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const messages = await prisma.whatsAppMessage.findMany({
      where: { contactId, type: 'TEXT' },
      orderBy: { timestamp: 'desc' },
      take: 25,
    });
    const transcript = messages
      .reverse()
      .map(m => `${m.direction === 'INBOUND' ? 'Cliente' : 'Bot'}: ${m.content}`)
      .join('\n');
    if (!transcript.trim()) return null;

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-3.5-flash' });
    const result = await model.generateContent(
      `Resume en máximo 4 líneas cortas, en español y sin Markdown, esta conversación de un cliente con el bot de Laser Inova (corte y grabado láser, impresión). Indica qué quiere el cliente y qué falta por resolver.\n\n${transcript}`
    );
    return result.response.text().trim();
  } catch (e) {
    console.warn('No se pudo generar el resumen para el aviso:', e);
    return null;
  }
}

/**
 * Avisa al administrador por push (PWA) y por WhatsApp (alertas de cotización y transferencias a humano).
 * Los números van en ADMIN_ALERT_PHONE separados por coma (ej. 52XXXXXXXXXX,52XXXXXXXXXX). Meta solo entrega texto libre si el administrador
 * escribió al número del bot en las últimas 24 h; fuera de esa ventana se usa la plantilla aprobada
 * WHATSAPP_ADMIN_TEMPLATE (una sola variable en el cuerpo, ej. "Aviso Laser Inova: {{1}}").
 */
async function notifyAdmin(text: string, url?: string) {
  const [title, ...rest] = text.split('\n').filter(Boolean);
  await sendPushToAdmins({ title: title.slice(0, 80), body: rest.join(' · ').slice(0, 180), url, tag: 'admin-alert' });

  const phones = (process.env.ADMIN_ALERT_PHONE || '').split(',').map(p => p.trim()).filter(Boolean);
  if (phones.length === 0) {
    console.warn("ADMIN_ALERT_PHONE no configurado: no se envió el aviso por WhatsApp al administrador.");
    return;
  }
  const template = process.env.WHATSAPP_ADMIN_TEMPLATE;
  // Las variables de plantilla no admiten saltos de línea ni más de 3 espacios seguidos.
  const flat = text.replace(/\s*\n+\s*/g, ' | ').replace(/ {2,}/g, ' ').slice(0, 900);

  await Promise.all(phones.map(async (adminPhone) => {
    try {
      await sendMessageToMeta(adminPhone, { type: 'text', text: { body: text } });
      return;
    } catch (e) {
      console.warn(`Texto libre a ${adminPhone} falló (¿fuera de la ventana de 24 h?):`, e);
    }
    if (!template) return;
    try {
      await sendMessageToMeta(adminPhone, {
        type: 'template',
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_ADMIN_TEMPLATE_LANG || 'es_MX' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: flat }] }],
        },
      });
    } catch (e) {
      console.warn(`Tampoco se pudo enviar la plantilla a ${adminPhone}:`, e);
    }
  }));
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
    
    if (!urlData.url) {
      throw new Error(`No se pudo obtener la URL del media (Meta respondió ${urlResponse.status}): ${JSON.stringify(urlData.error || urlData)}`);
    }

    // 2. Descargar el archivo
    const mediaResponse = await fetch(urlData.url, {
      headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
    });
    
    if (!mediaResponse.ok) {
      throw new Error(`No se pudo descargar el media de Meta (HTTP ${mediaResponse.status})`);
    }

    const arrayBuffer = await mediaResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer);

    let mimeType = urlData.mime_type;
    let folder = 'docs';
    let extension = 'bin';
    let finalBuffer: any = buffer;
    
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

    // 4. Guardar archivo en Vercel Blob
    const { put } = await import('@vercel/blob');
    const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const pathname = `uploads/whatsapp/${folder}/${uniqueId}.${extension}`;

    const blob = await put(pathname, finalBuffer, {
      access: 'public',
      contentType: mimeType || 'application/octet-stream',
    });

    // 5. Retornar el enlace público permanente
    return blob.url;

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
  let skipBot = false;

  if (msg.type === 'text') {
    messageContent = msg.text.body;

    // Si el cliente respondió citando un mensaje (reply de WhatsApp), Meta manda solo su id en context.id.
    // Buscamos ese mensaje para que el bot sepa a qué producto o mensaje se refiere.
    if (msg.context?.id) {
      const quoted = await prisma.whatsAppMessage.findUnique({
        where: { messageId: msg.context.id },
        select: { content: true },
      });
      if (quoted?.content) {
        const quotedText = quoted.content.replace(/\s*\n\s*/g, ' · ').slice(0, 200);
        messageContent = `↪️ En respuesta a «${quotedText}»\n${messageContent}`;
      }
    }
  } else if (msg.type === 'reaction') {
    // Como en WhatsApp: la reacción se pega al mensaje original (no es un mensaje nuevo ni se le responde).
    const targetId = msg.reaction?.message_id;
    const emoji: string | null = msg.reaction?.emoji || null; // vacío = el cliente quitó la reacción
    const target = targetId
      ? await prisma.whatsAppMessage.findUnique({ where: { messageId: targetId }, select: { id: true, content: true } })
      : null;
    if (!target) return null;

    await prisma.whatsAppMessage.update({ where: { id: target.id }, data: { reaction: emoji } });
    await notificationEmitter.emit('whatsapp_reaction', { id: target.id, contactId: contact.id, reaction: emoji });

    if (emoji && !contact.name?.includes('Simulador')) {
      const preview = target.content?.replace(/\s*\n\s*/g, ' ').slice(0, 80);
      await sendPushToAdmins({
        title: `${emoji} ${contact.name || `+${contact.phone}`}`,
        body: preview ? `Reaccionó a «${preview}»` : 'Reaccionó a un mensaje',
        url: conversationPath(contact.id),
        tag: `chat-${contact.id}`,
      });
    }
    return null;
  } else if (msg.type === 'sticker') {
    // El sticker llega como imagen webp: se guarda como imagen y no se le responde.
    skipBot = true;
    type = 'IMAGE';
    mediaUrl = await downloadAndCompressMedia(msg.sticker.id);
    mimeType = msg.sticker.mime_type || 'image/webp';
    messageContent = '🎭 Sticker';
  } else if (['image', 'document', 'audio', 'voice'].includes(msg.type)) {
    const mediaObj = msg[msg.type];
    type = msg.type.toUpperCase();
    if (type === 'VOICE') type = 'AUDIO'; // Normalizar
    
    mediaUrl = await downloadAndCompressMedia(mediaObj.id);
    mimeType = mediaObj.mime_type;
    
    if (msg.type === 'document') {
      messageContent = mediaObj.filename || 'Documento adjunto';
    } else if (mediaObj.caption) {
      // Texto que el cliente escribe junto a la foto: sin esto el bot no sabe qué pregunta.
      messageContent = mediaObj.caption;
    }
  }

  // Tipos que no manejamos (video, ubicación, contacto, botones...): se deja un texto descriptivo para que el bot no reciba un mensaje vacío.
  if (!messageContent && type === 'TEXT') {
    if (msg.type === 'video') messageContent = '[El cliente envió un video]';
    else if (msg.type === 'location') messageContent = `[El cliente compartió una ubicación${msg.location?.name ? `: ${msg.location.name}` : ''}]`;
    else if (msg.type === 'contacts') messageContent = '[El cliente compartió un contacto]';
    else if (msg.type === 'interactive') messageContent = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '[El cliente respondió un botón]';
    else if (msg.type === 'button') messageContent = msg.button?.text || '[El cliente respondió un botón]';
    else messageContent = `[El cliente envió un mensaje de tipo "${msg.type}" que no se puede mostrar]`;
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

  // Push a los admins: quién escribe y qué dice (el simulador no avisa).
  if (!contact.name?.includes('Simulador')) {
    const label = { IMAGE: skipBot ? '' : '📷 Foto', AUDIO: '🎤 Audio', DOCUMENT: '📄 Documento' }[type as string];
    const preview = messageContent.replace(/\s*\n\s*/g, ' ').slice(0, 160);
    const body = label ? (preview ? `${label}: ${preview}` : label) : preview || 'Nuevo mensaje';
    await sendPushToAdmins({
      title: `💬 ${contact.name || `+${contact.phone}`}`,
      body,
      url: conversationPath(contact.id),
      tag: `chat-${contact.id}`,
    });
  }

  return { type: 'message', message: savedMessage, contact, skipBot };
}

// Mensajes del cliente que disparan al bot (los stickers se guardan como IMAGE pero no lo disparan).
const BOT_TRIGGER_TYPES = ['TEXT', 'IMAGE', 'AUDIO'];

async function latestBotTriggerMessage(contactId: string) {
  return prisma.whatsAppMessage.findFirst({
    where: {
      contactId,
      direction: 'INBOUND',
      type: { in: BOT_TRIGGER_TYPES },
      NOT: { content: '🎭 Sticker' },
    },
    orderBy: { timestamp: 'desc' },
    select: { id: true, timestamp: true },
  });
}

/**
 * Agrupa mensajes seguidos del cliente. En serverless no hay timers persistentes, así que:
 * cada llamada espera `debounceMs` y luego revisa en la BD si llegó un mensaje más nuevo
 * (entonces esa otra llamada se encarga) o si alguien ya contestó (humano o bot).
 * Devuelve true si esta llamada debe seguir y responder.
 */
async function shouldRespondAfterDebounce(contactId: string, debounceMs: number): Promise<boolean> {
  const mine = await latestBotTriggerMessage(contactId);
  if (!mine) return true;

  await new Promise((resolve) => setTimeout(resolve, debounceMs));

  const latest = await latestBotTriggerMessage(contactId);
  if (latest && latest.id !== mine.id) return false; // llegó otro mensaje: responde la llamada de ese

  const answered = await prisma.whatsAppMessage.findFirst({
    where: { contactId, direction: 'OUTBOUND', timestamp: { gt: mine.timestamp } },
    select: { id: true },
  });
  return !answered;
}

export async function processAIAgentResponse(contactId: string, opts?: { debounceMs?: number }) {
  // Fetch contact to know if it's a simulator or real case
  const contact = await prisma.whatsAppContact.findUnique({
    where: { id: contactId }
  });

  if (!contact) return;

  // En Vercel (Serverless) un setTimeout compartido entre invocaciones no sirve (cada mensaje
  // puede caer en otra instancia). El agrupado se hace consultando la BD tras una pausa corta.
  if (opts?.debounceMs && opts.debounceMs > 0) {
    const go = await shouldRespondAfterDebounce(contactId, opts.debounceMs).catch(() => true);
    if (!go) return;
  }

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
      // Fotos/audios sin texto llegan con content vacío; Gemini rechaza partes de texto vacías.
      const text = msg.content || (msg.type === 'IMAGE' ? '[El cliente envió una imagen]' : msg.type === 'AUDIO' ? '[El cliente envió un audio]' : '');
      if (!text) return;
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += `\n${text}`;
      } else {
        contents.push({ role, parts: [{ text }] });
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
          tipo_concepto: { type: SchemaType.STRING, description: 'Si el proyecto es un producto del catálogo (ej. Termos, libretas) manda "REVENTA". Si es material suelto manda "CORTE" o "GRABADO".' },
          descripcion_concepto: { type: SchemaType.STRING, description: 'Descripción detallada del concepto (ej. "Termo Space de 550ml con grabado láser")' },
        },
        required: ['project_name', 'material', 'ancho_cm', 'alto_cm', 'cantidad', 'nombre_cliente', 'tipo_concepto'],
      }
    };

    const transferir_a_humano: FunctionDeclaration = {
      name: 'transferir_a_humano',
      description: 'Avisa al equipo humano para que contacte al cliente si se enoja, pide hablar con una persona, o hace preguntas técnicas muy complejas. El bot sigue activo en el chat y sigue contestando.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: { motivo: { type: SchemaType.STRING, description: 'Motivo de la transferencia' } },
        required: ['motivo'],
      }
    };

    const avisar_duda_al_equipo: FunctionDeclaration = {
      name: 'avisar_duda_al_equipo',
      description: 'Avisa al equipo humano de una duda del cliente que NO puedes responder con los datos del negocio, las reglas ni las herramientas (ej. un material raro, una pregunta técnica puntual, algo que no sabes). El bot sigue activo en el chat. Úsala SOLO en ese caso; no para cotizaciones ni cuando el cliente pide hablar con una persona (para eso está transferir_a_humano).',
      parameters: {
        type: SchemaType.OBJECT,
        properties: { duda: { type: SchemaType.STRING, description: 'La pregunta o duda del cliente, completa y con el contexto necesario para que el equipo pueda contestarla' } },
        required: ['duda'],
      }
    };

    const buscar_productos_en_catalogo: FunctionDeclaration = {
      name: 'buscar_productos_en_catalogo',
      description: 'Busca productos reales en la base de datos (catálogo) para ofrecerle opciones al cliente. Úsalo cuando el cliente pregunte qué tipos de termos, tazas, libretas u otros artículos promocionales tienes.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: { 
          termino_busqueda: { type: SchemaType.STRING, description: 'Palabra o frase de búsqueda (ej. "termo", "taza azul", "cilindro acero")' },
          pagina: { type: SchemaType.INTEGER, description: 'Página de resultados (usa 1 la primera vez, y 2, 3... si el cliente pide ver "más opciones" o "otros modelos")' }
        },
        required: ['termino_busqueda'],
      }
    };

    const consultar_colores_producto: FunctionDeclaration = {
      name: 'consultar_colores_producto',
      description: 'Consulta los COLORES y la disponibilidad de un producto concreto del catálogo, y puede mandar la FOTO de un color específico. Úsala cuando el cliente pregunte de qué colores hay un modelo, si lo tienes en otro color, cuánto stock hay, o cuando pida VER un color en particular (ej. "enséñame el marmoleado"): en ese caso pasa también color_foto y la foto de ese color se le manda automáticamente por WhatsApp.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          producto: { type: SchemaType.STRING, description: 'Nombre del producto tal como lo mencionó el cliente o aparece en la foto citada (ej. "VASO ELMAS", "Termo Space")' },
          color_foto: { type: SchemaType.STRING, description: 'Opcional. Color del que el cliente quiere ver la foto (ej. "marmoleado", "rosa", "azul marino"). Si lo pasas, se envía la foto de ese color.' },
        },
        required: ['producto'],
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
    const rag = await getRelevantRules(lastUserMessage, genAI);
    const ragContext = rag.context;
    const toolsUsed: string[] = [];
    // Visible en los logs de Vercel (console.warn no se elimina en producción): sirve para saber si una conducta viene de Pinecone.
    console.warn(`[RAG] Mensaje: "${lastUserMessage.slice(0, 80)}" | Reglas inyectadas: ${ragContext?.trim() ? ragContext.slice(0, 600) : '(ninguna)'}`);

    const systemInstruction = getSecretarySystemPrompt(clientContext, ragContext, hasRequestedQuote);

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash",
      systemInstruction,
      tools: [{ functionDeclarations: [notificar_solicitud_cotizacion, transferir_a_humano, avisar_duda_al_equipo, buscar_productos_en_catalogo, consultar_colores_producto] }]
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
        } else if (lastClientMessage.mediaUrl.startsWith('http')) {
          // Archivo en Vercel Blob: descargarlo para pasárselo a Gemini
          const mediaRes = await fetch(lastClientMessage.mediaUrl);
          if (mediaRes.ok) {
            base64Data = Buffer.from(await mediaRes.arrayBuffer()).toString('base64');
          } else {
            console.error(`No se pudo descargar el media del bot (${mediaRes.status}): ${lastClientMessage.mediaUrl}`);
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
        toolsUsed.push(call.name);
        if (call.name === 'transferir_a_humano') {
          const args = call.args as any;
          // El bot NO se apaga: solo se avisa al equipo y el bot sigue contestando en el chat.
          // Si alguien del equipo escribe manualmente en el chat, ahí sí se pausa (sendManualMessageAction).
          if (!contact.name?.includes("Simulador")) {
            const summary = await quickConversationSummary(contact.id);
            await notifyAdmin(
              [
                `🔔 ${contact.name || 'Un cliente'} necesita atención humana`,
                `Tel: +${contact.phone}`,
                `Motivo: ${args.motivo}`,
                summary ? `\nResumen:\n${summary}` : '',
                `\nAbrir chat: ${conversationLink(contact.id)}`,
              ].filter(Boolean).join('\n'),
              conversationPath(contact.id)
            );
          }

          // El motivo es interno (va solo en el aviso al administrador), no se le muestra al cliente.
          responseText = `Claro, ya avisé a uno de nuestros asesores para que te contacte. Mientras tanto, cualquier duda me la puedes escribir por aquí.`;
        } else if (call.name === 'buscar_productos_en_catalogo') {
          const args = call.args as any;
          const searchKeyword = args.termino_busqueda || "termo";
          const pagina = args.pagina || 1;
          const skip = Math.max(0, (pagina - 1) * 3);
          
          const searchTokens = searchKeyword.split(/\s+/).filter((t: string) => t.length > 1);
          const whereClause: any = { active: true };
          if (searchTokens.length > 0) {
            whereClause.AND = searchTokens.map((t: string) => ({
              name: { contains: t }
            }));
          }
          
          const foundProducts = await prisma.product.findMany({
            where: whereClause,
            take: 3,
            skip: skip,
            distinct: ['model'],
            select: { name: true, model: true, sku: true, unitPrice: true, color: true, image: true, images: true }
          });

          // 1. Enviar imágenes de WhatsApp si hay productos
          for (const prod of foundProducts) {
             let imageUrl = null;
             
             // Priorizar la imagen genérica (que suele tener todos los colores)
             if (prod.images) {
                try {
                   const parsedImages = JSON.parse(prod.images);
                   if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                      imageUrl = parsedImages[0];
                   }
                } catch(e) {}
             }
             // Si no hay imagen genérica, usar la específica del color
             if (!imageUrl) {
                 imageUrl = prod.image;
             }

             if (imageUrl) {
                let cleanName = prod.name;
                if (prod.color) cleanName = cleanName.replace(new RegExp(prod.color, 'i'), '').trim();
                if (prod.model) cleanName = cleanName.replace(new RegExp(prod.model, 'i'), '').trim();
                // Limpiar posibles espacios dobles o guiones
                cleanName = cleanName.replace(/[-\s]+$/, '').trim();

                const caption = `🔥 ${cleanName || prod.name}\n💰 Precio: $${prod.unitPrice.toFixed(2)} MXN`;
                
                // Enviar a WhatsApp Real y conservar el id de Meta (sirve para palomitas y para ubicar la cita si el cliente responde a esta foto)
                let imageMessageId = `bot_img_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                if (!contact.name?.includes("Simulador")) {
                   const imgRes = await sendMessageToMeta(contact.phone, {
                      type: 'image',
                      image: { link: imageUrl, caption }
                   }).catch(console.error);
                   if (imgRes?.messages?.[0]?.id) imageMessageId = imgRes.messages[0].id;
                }

                // Guardar en la DB para que se vea en el UI
                const sentImgMsg = await prisma.whatsAppMessage.create({
                  data: {
                    contactId: contact.id,
                    messageId: imageMessageId,
                    direction: 'OUTBOUND',
                    type: 'IMAGE',
                    mediaUrl: imageUrl,
                    content: caption,
                    status: 'DELIVERED',
                  }
                });
                await notificationEmitter.emit('whatsapp_message', { message: sentImgMsg, contact });
             }
          }

          // Agregar la llamada de función al historial
          if (result.response.candidates && result.response.candidates[0].content) {
            contents.push(result.response.candidates[0].content);
          }

          // Responder con los resultados a Gemini indicando que ya mandamos fotos
          contents.push({
            role: "user",
            parts: [{
              functionResponse: {
                name: "buscar_productos_en_catalogo",
                response: {
                  productos: foundProducts.length > 0 ? foundProducts.map(p => ({
                    nombre: p.name,
                    estado: "FOTOS Y PRECIOS ENVIADOS EXITOSAMENTE POR WHATSAPP AL CLIENTE. Diles algo corto como 'Ahí te mandé unas fotos con los precios, ¿cuál te gusta más?'"
                  })) : [{ mensaje: "No se encontraron productos con ese término." }]
                }
              }
            }]
          });

          // Segunda llamada a Gemini para que elabore la respuesta natural
          try {
            const followUpResult = await model.generateContent({ contents });
            const funcs = followUpResult.response.functionCalls();
            if (funcs && funcs.length > 0) {
              responseText = foundProducts.length > 0 ? "Ahí te envié algunas opciones con sus precios. ¿Te interesa alguna?" : "No encontré productos con ese término exacto, ¿tienes algún otro en mente?";
            } else {
              responseText = followUpResult.response.text();
            }
          } catch(e) {
            responseText = foundProducts.length > 0 ? "Ahí te envié algunas opciones con sus precios. ¿Te interesa alguna?" : "No encontré productos con ese término exacto, ¿tienes algún otro en mente?";
          }

        } else if (call.name === 'consultar_colores_producto') {
          const args = call.args as any;
          const tokens = String(args.producto || '').split(/\s+/).filter((t: string) => t.length > 1);

          const variants = tokens.length > 0
            ? await prisma.product.findMany({
                where: { active: true, AND: tokens.map((t: string) => ({ name: { contains: t } })) },
                take: 40,
                select: { name: true, color: true, stockQuantity: true, unitPrice: true, model: true, provider: true, image: true },
              })
            : [];

          // Foto del color pedido (misma regla que la ficha del producto en el CRM: Doble Vela tiene una foto por color).
          let fotoColorEnviada: string | null = null;
          const normalize = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '');
          const stripCode = (t: string) => t.replace(/^\d+\s*-\s*/, '');
          if (args.color_foto && variants.length > 0) {
            const wanted = normalize(stripCode(String(args.color_foto)));
            const match = variants.find(v => v.color && normalize(stripCode(v.color)).includes(wanted));
            if (match) {
              const colorLabel = stripCode(match.color!);
              const photoUrl = match.provider === 'Doble Vela' && match.model
                ? `https://doblevela.com/images/large/${match.model}_${normalize(colorLabel)}_lrg.jpg`
                : match.image;
              if (photoUrl) {
                const baseName = match.name.replace(new RegExp(match.color!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
                const caption = `🔥 ${baseName || match.name} · ${colorLabel}\n💰 Precio: $${match.unitPrice.toFixed(2)} MXN`;
                let photoMessageId = `bot_img_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                try {
                  if (!contact.name?.includes("Simulador")) {
                    const imgRes = await sendMessageToMeta(contact.phone, { type: 'image', image: { link: photoUrl, caption } });
                    if (imgRes?.messages?.[0]?.id) photoMessageId = imgRes.messages[0].id;
                  }
                  const sentPhoto = await prisma.whatsAppMessage.create({
                    data: { contactId: contact.id, messageId: photoMessageId, direction: 'OUTBOUND', type: 'IMAGE', mediaUrl: photoUrl, content: caption, status: 'DELIVERED' },
                  });
                  await notificationEmitter.emit('whatsapp_message', { message: sentPhoto, contact });
                  fotoColorEnviada = colorLabel;
                } catch (e) {
                  console.error('No se pudo enviar la foto del color:', e);
                }
              }
            }
          }

          // Un renglón por color, con stock sumado por si hay varias claves del mismo color.
          const byColor = new Map<string, { color: string; stock: number; precio: number }>();
          for (const v of variants) {
            const color = (v.color || 'Sin color especificado').trim();
            const cur = byColor.get(color.toLowerCase());
            if (cur) cur.stock += v.stockQuantity;
            else byColor.set(color.toLowerCase(), { color, stock: v.stockQuantity, precio: v.unitPrice });
          }

          if (result.response.candidates && result.response.candidates[0].content) {
            contents.push(result.response.candidates[0].content);
          }
          contents.push({
            role: 'user',
            parts: [{
              functionResponse: {
                name: 'consultar_colores_producto',
                response: variants.length > 0
                  ? {
                      producto_consultado: args.producto,
                      colores: Array.from(byColor.values()).map(c => ({
                        color: c.color,
                        disponible: c.stock > 0 ? `Sí (${c.stock} pzas en stock)` : 'Sin stock por ahora, se puede consultar con proveedor',
                        precio_unitario_mxn: c.precio,
                      })),
                      foto_enviada: fotoColorEnviada ? `Sí, ya se le mandó por WhatsApp la foto del color ${fotoColorEnviada}.` : 'No se mandó foto.',
                      instruccion: fotoColorEnviada
                        ? 'Dile en una frase corta que ahí va la foto de ese color y pregúntale cuántas piezas necesita. No listes todos los colores.'
                        : 'Dile al cliente los colores disponibles de forma breve y pregúntale cuál prefiere. Si pidió ver un color y no se mandó foto, dile que se la compartes en un momento.',
                    }
                  : { mensaje: 'No encontré ese producto en el catálogo. Pídele al cliente que lo describa de otra forma.' },
              },
            }],
          });

          try {
            const followUp = await model.generateContent({ contents });
            responseText = followUp.response.text();
          } catch (e) {
            console.error('Error redactando respuesta de colores:', e);
            responseText = variants.length > 0
              ? `De ese modelo tenemos: ${Array.from(byColor.values()).map(c => c.color).join(', ')}. ¿Cuál te gusta más?`
              : 'No encontré ese producto en el catálogo, ¿me lo describes de otra forma?';
          }
        } else if (call.name === 'avisar_duda_al_equipo') {
          const args = call.args as any;

          if (!contact.name?.includes("Simulador")) {
            const summary = await quickConversationSummary(contact.id);
            await notifyAdmin(
              [
                `❓ ${contact.name || 'Un cliente'} tiene una duda que el bot no pudo resolver`,
                `Tel: +${contact.phone}`,
                `Duda: ${args.duda}`,
                summary ? `\nResumen:\n${summary}` : '',
                `\nResponder en el chat: ${conversationLink(contact.id)}`,
              ].filter(Boolean).join('\n'),
              conversationPath(contact.id)
            ).catch((e) => console.error('Error avisando duda al equipo:', e));
          }

          if (result.response.candidates && result.response.candidates[0].content) {
            contents.push(result.response.candidates[0].content);
          }
          contents.push({
            role: 'user',
            parts: [{
              functionResponse: {
                name: 'avisar_duda_al_equipo',
                response: {
                  aviso_enviado: true,
                  instruccion: 'Dile al cliente en una frase corta que lo confirmas con el equipo y le avisas por este mismo chat. No menciones herramientas ni notificaciones.',
                },
              },
            }],
          });

          try {
            const followUp = await model.generateContent({ contents });
            responseText = followUp.response.text();
          } catch (e) {
            console.error('Error redactando respuesta de duda al equipo:', e);
            responseText = 'Déjame confirmarlo con el equipo y te aviso por aquí.';
          }
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
              tipo_concepto: args.tipo_concepto,
              descripcion_concepto: args.descripcion_concepto,
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
            await notificationEmitter.emit('whatsapp_message', { message: internalMessage, contact });
          } catch (e) {
            console.error("Error guardando mensaje interno de El Chalán:", e);
          }

          // 3. Alertar al admin (si falla, no rompas el flujo de la IA)
          if (!contact.name?.includes("Simulador")) {
            await notifyAdmin(`${chalanResult.adminAlertMsg}\n\nAbrir chat: ${conversationLink(contact.id)}`, conversationPath(contact.id));
          } else {
            console.log("[SIMULADOR] Alerta de cotización al admin simulada:", chalanResult.adminAlertMsg);
          }
          
          responseText = `¡Excelente! Ya capturé todos los detalles y se los pasé al taller. En un momento un asesor revisará la información y te enviará la cotización por este medio.`;
        }
      } else {
        responseText = result.response.text();
      }

      if (!responseText) {
        responseText = "Entendido. ¿Tienes alguna otra duda o te puedo ayudar con algo más?";
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
        status: 'SENT',
        // Qué influyó en esta respuesta (se muestra en el chat del CRM para depurar al bot)
        aiTrace: JSON.stringify({ rules: rag.sources, tools: toolsUsed }),
      }
    });

    const pusherMessage = { ...savedMessage };
    if (pusherMessage.mediaUrl && pusherMessage.mediaUrl.length > 5000) {
      pusherMessage.mediaUrl = 'FETCH_REQUIRED';
    }
    await notificationEmitter.emit('whatsapp_message', { message: pusherMessage, contact });
    
  } catch (error) {
    console.error("Error en processAIAgentResponse:", error);
  }
}

export async function deleteConversationService(contactId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Desvincular cotizaciones para que no se pierdan ni fallen por FK
    await tx.quote.updateMany({
      where: { contactId },
      data: { contactId: null },
    });

    // 2. Eliminar logs de IA si existen
    await tx.aiUsageLog.deleteMany({
      where: { contactId },
    });

    // 3. Eliminar todos los mensajes asociados
    await tx.whatsAppMessage.deleteMany({
      where: { contactId },
    });

    // 4. Eliminar el contacto de WhatsApp
    await tx.whatsAppContact.delete({
      where: { id: contactId },
    });

    return true;
  });
}

export async function clearConversationMessagesService(contactId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.whatsAppMessage.deleteMany({
      where: { contactId },
    });
    return true;
  });
}

