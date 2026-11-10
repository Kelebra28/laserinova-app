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
import { generateQuotePDF } from '@/lib/pdf';
import { resolveProductUnitPrice, modelCostKey } from '@/lib/calculations';
import { getProductPricingGlobals, getModelMaxCostMap } from '@/lib/product-pricing';

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

/**
 * ¿Este teléfono es de un administrador (ADMIN_ALERT_PHONE)? Se compara por los últimos 10 dígitos
 * porque Meta entrega los números de México como 521XXXXXXXXXX y la variable suele ir como 52XXXXXXXXXX.
 */
export function isAdminPhone(phone: string): boolean {
  const last10 = (p: string) => p.replace(/\D/g, '').slice(-10);
  const mine = last10(phone);
  if (mine.length < 10) return false;
  return (process.env.ADMIN_ALERT_PHONE || '').split(',').map(p => last10(p.trim())).some(p => p === mine);
}

/** Enlace que abre una cotización dentro del CRM. */
export function quoteLink(quoteId: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://app.laserinova.com').replace(/\/$/, '');
  return `${base}/dashboard/quotes/${quoteId}`;
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

  // Los administradores hablan con el bot de gestión (whatsapp-admin.service), no con el bot de clientes.
  const isAdmin = isAdminPhone(senderPhone);
  if (isAdmin && contact.botMode) {
    contact = await prisma.whatsAppContact.update({ where: { id: contact.id }, data: { botMode: false } });
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

    if (emoji && !isAdminPhone(senderPhone) && !contact.name?.includes('Simulador')) {
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

  // Push a los admins: quién escribe y qué dice (el simulador y los propios admins no avisan).
  if (!isAdmin && !contact.name?.includes('Simulador')) {
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

  return { type: 'message', message: savedMessage, contact, skipBot, isAdmin };
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
 * (entonces esa otra llamada se encarga). Si el mensaje ya quedó contestado lo decide
 * runAIAgentResponse con el candado tomado, que es cuando el historial ya no cambia.
 * Devuelve true si esta llamada debe seguir y responder.
 */
async function shouldRespondAfterDebounce(contactId: string, debounceMs: number): Promise<boolean> {
  const mine = await latestBotTriggerMessage(contactId);
  if (!mine) return true;

  await new Promise((resolve) => setTimeout(resolve, debounceMs));

  const latest = await latestBotTriggerMessage(contactId);
  return !latest || latest.id === mine.id; // llegó otro mensaje: responde la llamada de ese
}

// Candado por contacto: una sola respuesta del bot a la vez. Sin él, si el cliente escribe
// mientras el bot sigue armando la respuesta anterior, dos corridas se enciman (avisos
// duplicados al equipo, historial que termina en turno del bot y Gemini lo rechaza).
const BOT_LOCK_TTL_MS = 90 * 1000; // por si una corrida muere sin soltarlo
const BOT_LOCK_WAIT_MS = 45 * 1000;

async function tryAcquireBotLock(contactId: string): Promise<Date | null> {
  const lockedUntil = new Date(Date.now() + BOT_LOCK_TTL_MS);
  try {
    await prisma.whatsAppBotLock.create({ data: { contactId, lockedUntil } });
    return lockedUntil;
  } catch (e) {
    if ((e as { code?: string } | null)?.code !== 'P2002') throw e; // P2002 = ya hay candado para este contacto
  }
  // Candado vencido (la corrida anterior murió): se lo queda quien lo actualice primero.
  const taken = await prisma.whatsAppBotLock.updateMany({
    where: { contactId, lockedUntil: { lt: new Date() } },
    data: { lockedUntil },
  });
  return taken.count === 1 ? lockedUntil : null;
}

/**
 * Espera su turno para contestarle a este contacto. Devuelve la marca del candado (para soltarlo)
 * o null si no se pudo tomar: falta la tabla o se agotó la espera. En ese caso se contesta
 * de todos modos, porque es peor dejar al cliente sin respuesta que arriesgar un encimado.
 */
async function acquireBotLock(contactId: string): Promise<Date | null> {
  const deadline = Date.now() + BOT_LOCK_WAIT_MS;
  try {
    for (;;) {
      const lock = await tryAcquireBotLock(contactId);
      if (lock) return lock;
      if (Date.now() >= deadline) {
        console.warn(`[BOT] Candado ocupado más de ${BOT_LOCK_WAIT_MS / 1000}s para ${contactId}; se contesta sin candado.`);
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  } catch (e) {
    console.error('[BOT] No se pudo usar el candado (¿falta la tabla WhatsAppBotLock?); se contesta sin candado:', e);
    return null;
  }
}

async function releaseBotLock(contactId: string, lock: Date) {
  // Solo suelta el suyo: si venció y otra corrida lo tomó, lockedUntil ya es otro.
  await prisma.whatsAppBotLock
    .deleteMany({ where: { contactId, lockedUntil: lock } })
    .catch((e) => console.error('[BOT] No se pudo soltar el candado:', e));
}

// Notas INTERNAL que son instrucciones del sistema para el bot: van a Gemini como turno
// 'user'. El resto de notas internas y lo que ya se le mandó al cliente van como 'model'.
const SYSTEM_INSTRUCTION_PREFIX = '[INSTRUCCIÓN INTERNA DEL SISTEMA]';
const SYSTEM_NOTE_PREFIX = '[NOTA INTERNA DEL SISTEMA]';

/**
 * El bot guarda en aiTrace.upTo el último mensaje del cliente que alcanzó a leer. Si el cliente
 * escribió mientras el bot armaba esa respuesta, su mensaje queda ANTES de la respuesta al ordenar
 * por hora, aunque el bot nunca lo vio. Aquí se recoloca después de esa respuesta para que la
 * siguiente corrida lo conteste en vez de darlo por atendido.
 */
function moveUnseenClientMessagesAfterReply<T extends { id: string; direction: string; aiTrace: string | null }>(msgs: T[]): T[] {
  for (let r = msgs.length - 1; r >= 0; r--) {
    const reply = msgs[r];
    if (reply.direction !== 'OUTBOUND' || !reply.aiTrace) continue;

    let upTo: unknown;
    try { upTo = JSON.parse(reply.aiTrace).upTo; } catch { /* aiTrace viejo o ilegible */ }
    const seenIdx = typeof upTo === 'string' ? msgs.findIndex((m) => m.id === upTo) : -1;
    if (seenIdx < 0 || seenIdx > r) return msgs;

    const unseen = msgs.slice(seenIdx + 1, r).filter((m) => m.direction === 'INBOUND');
    if (unseen.length === 0) return msgs;
    const rest = msgs.filter((m) => !unseen.includes(m));
    const at = rest.indexOf(reply) + 1;
    return [...rest.slice(0, at), ...unseen, ...rest.slice(at)];
  }
  return msgs;
}

const BOT_FAILURE_MARKER = '⚠️ Falla del bot';
const BOT_FAILURE_ALERT_COOLDOWN_MS = 10 * 60 * 1000;

/**
 * El bot falló al contestar: avisa a los administradores (WhatsApp + push) y deja una nota
 * interna en el chat. NO escribe nada al cliente. Para no spamear mientras Gemini siga caído,
 * solo avisa una vez por contacto cada 10 minutos (la nota interna sirve de marca).
 */
async function reportBotFailure(contact: { id: string; name: string | null; phone: string }, error: unknown) {
  try {
    if (contact.name?.includes('Simulador')) return;

    const recent = await prisma.whatsAppMessage.findFirst({
      where: {
        contactId: contact.id,
        direction: 'INTERNAL',
        content: { startsWith: BOT_FAILURE_MARKER },
        timestamp: { gt: new Date(Date.now() - BOT_FAILURE_ALERT_COOLDOWN_MS) },
      },
      select: { id: true },
    });
    if (recent) return;

    const detail = (error instanceof Error ? error.message : String(error)).replace(/\s+/g, ' ').slice(0, 200);
    await prisma.whatsAppMessage.create({
      data: {
        contactId: contact.id,
        messageId: `bot_failure_${Date.now()}`,
        direction: 'INTERNAL',
        type: 'TEXT',
        content: `${BOT_FAILURE_MARKER}: no pudo contestar este mensaje (${detail}). El cliente no recibió ningún aviso.`,
        status: 'SENT',
      },
    });

    await notifyAdmin(
      [
        `⚠️ El bot dejó de funcionar con ${contact.name || 'un cliente'}`,
        `Tel: +${contact.phone}`,
        `No pudo contestar su último mensaje y el cliente NO recibió ningún aviso. Contéstale tú desde el CRM.`,
        `Error: ${detail}`,
      ].join('\n'),
      '/dashboard/chats'
    );
  } catch (e) {
    console.error('No se pudo avisar de la falla del bot:', e);
  }
}

/**
 * Genera el PDF de una cotización, se lo manda al cliente por WhatsApp y lo guarda en el chat.
 * No revisa sesión: quien lo llame (acción del CRM o el flujo de autorización por WhatsApp)
 * es responsable de haber autorizado el envío. Lanza Error con un mensaje legible si falla.
 * Devuelve el contacto y el folio; disparar la respuesta del bot queda a cargo de quien llama.
 */
export async function sendQuotePdfToClient(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      client: true,
      concepts: { orderBy: { order: 'asc' }, include: { material: true, product: true } },
    },
  });

  if (!quote || (!quote.clientId && !quote.contactId)) {
    throw new Error("Cotización no encontrada o sin cliente asociado");
  }

  const contact = await prisma.whatsAppContact.findFirst({
    where: quote.contactId ? { id: quote.contactId } : { clientId: quote.clientId },
  });
  if (!contact) {
    throw new Error("El cliente no tiene un número de WhatsApp registrado en el sistema");
  }

  // Generar PDF y pasarlo a Base64 para Vercel
  const pdfBuffer = (await generateQuotePDF([quote])) as Buffer;
  const publicUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
  const filename = `Cotizacion_${quote.folio}_${Date.now()}.pdf`;

  // Mandar el PDF de verdad por WhatsApp (el simulador no sale a Meta)
  let metaMessageId = `local_pdf_${Date.now()}`;
  if (!contact.name?.includes('Simulador')) {
    try {
      const sentId = await sendDocumentToMeta(contact.phone, pdfBuffer, filename, `Cotización ${quote.folio}`);
      if (sentId) metaMessageId = sentId;
    } catch (e: any) {
      console.error('Error enviando PDF de cotización por WhatsApp:', e);
      const msg = String(e?.message || '');
      const outside24h = /131047|re-engage|24 hours/i.test(msg);
      throw new Error(
        outside24h
          ? 'Han pasado más de 24 h desde el último mensaje del cliente: WhatsApp no deja enviar el PDF hasta que él escriba (o se use una plantilla).'
          : `WhatsApp rechazó el envío: ${msg}`
      );
    }
  }

  const docMsg = await prisma.whatsAppMessage.create({
    data: {
      contactId: contact.id,
      messageId: metaMessageId,
      direction: 'OUTBOUND',
      type: 'DOCUMENT',
      content: `Cotización ${quote.folio}`,
      mediaUrl: publicUrl,
      mimeType: 'application/pdf',
      status: 'SENT',
    },
  });
  await notificationEmitter.emit('whatsapp_message', { message: { ...docMsg, mediaUrl: 'FETCH_REQUIRED' }, contact });

  // Instrucción INTERNAL para que la IA le avise al cliente que ya tiene su cotización
  await prisma.whatsAppMessage.create({
    data: {
      contactId: contact.id,
      messageId: `internal_instruction_${Date.now()}`,
      direction: 'INTERNAL',
      type: 'TEXT',
      content: `${SYSTEM_INSTRUCTION_PREFIX}: Acabo de enviarle al cliente la Cotización Aprobada ${quote.folio} en formato PDF. El total es de $${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN.
Por favor, escríbele un mensaje corto y amigable avisándole que ya tiene la cotización oficial arriba y que cualquier duda me la escriba por aquí. No le preguntes qué le parece.
REGLA CRÍTICA: Recuerda que tienes prohibido desglosar costos en materiales y horas. Solo menciona el precio final que acabo de darte.`,
      status: 'DELIVERED',
    },
  });

  return { contact, folio: quote.folio, total: quote.total };
}

/**
 * Botón manual "Reintentar bot": vuelve a contestar el último mensaje del cliente cuando el bot
 * falló y se quedó sin responder. No hace nada si ya hay una respuesta (humana o del bot)
 * posterior al último mensaje del cliente.
 */
export async function retryBotReply(contactId: string): Promise<{ success: boolean; error?: string }> {
  const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } });
  if (!contact) return { success: false, error: 'Contacto no encontrado.' };
  if (!contact.botMode) return { success: false, error: 'El bot está en modo humano. Actívalo primero.' };

  const latest = await latestBotTriggerMessage(contactId);
  if (!latest) return { success: false, error: 'No hay ningún mensaje del cliente que contestar.' };

  const answerFilter = { contactId, direction: 'OUTBOUND', timestamp: { gt: latest.timestamp } };
  if (await prisma.whatsAppMessage.findFirst({ where: answerFilter, select: { id: true } })) {
    return { success: false, error: 'El último mensaje del cliente ya tiene respuesta.' };
  }

  await executeAIAgentResponse(contactId).catch(console.error);

  // executeAIAgentResponse no lanza error si falla (avisa a los admins), así que se verifica el resultado.
  const replied = await prisma.whatsAppMessage.findFirst({ where: answerFilter, select: { id: true } });
  return replied ? { success: true } : { success: false, error: 'El bot volvió a fallar. Revisa el aviso en el chat o contesta tú.' };
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
  const lock = await acquireBotLock(contactId);
  try {
    return await runAIAgentResponse(contactId);
  } finally {
    if (lock) await releaseBotLock(contactId, lock);
  }
}

async function runAIAgentResponse(contactId: string) {
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
    const recentMessages = moveUnseenClientMessagesAfterReply(recentMessagesDesc.reverse());
    // Se guarda en aiTrace.upTo de la respuesta (ver moveUnseenClientMessagesAfterReply).
    const lastSeenInboundId = recentMessages.slice().reverse().find(m => m.direction === 'INBOUND')?.id;

    // Construir el historial (Gemini exige que los roles 'user' y 'model' se alternen estrictamente)
    const contents: any[] = [];
    recentMessages.forEach(msg => {
      if (msg.direction === 'INTERNAL' && msg.content?.startsWith(BOT_FAILURE_MARKER)) return; // nota interna, no es parte de la charla
      const isSystemNote = msg.direction === 'INTERNAL'
        && [SYSTEM_INSTRUCTION_PREFIX, SYSTEM_NOTE_PREFIX].some(p => msg.content?.startsWith(p));
      const role = msg.direction === 'INBOUND' || isSystemNote ? 'user' : 'model';
      // Fotos/audios sin texto llegan con content vacío; Gemini rechaza partes de texto vacías.
      const text = msg.content || (msg.type === 'IMAGE' ? '[El cliente envió una imagen]' : msg.type === 'AUDIO' ? '[El cliente envió un audio]' : '');
      if (!text) return;
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += `\n${text}`;
      } else {
        contents.push({ role, parts: [{ text }] });
      }
    });

    // Gemini rechaza un historial que termina en turno del bot ("Requests ending with a model
    // turn"). Si lo último ya es nuestro, no hay nada nuevo del cliente que contestar.
    if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
      console.warn(`[BOT] Sin mensaje pendiente del cliente para ${contactId}; no se contesta.`);
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("No hay GEMINI_API_KEY configurada.");
      await reportBotFailure(contact, new Error('GEMINI_API_KEY no configurada'));
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Definición de Herramientas (Function Calling)
    const notificar_solicitud_cotizacion: FunctionDeclaration = {
      name: 'notificar_solicitud_cotizacion',
      description: 'Envía los datos recolectados al administrador humano para que autorice y genere la cotización final. IMPORTANTE: NO puedes usar esta herramienta hasta tener los datos técnicos obligatorios: Material, Ancho, Alto y Cantidad. Si falta alguno, pregúntale al cliente antes de llamar a esta función. El nombre y el correo son opcionales: NUNCA dejes de llamarla por no tenerlos.',
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
          nombre_cliente: { type: SchemaType.STRING, description: 'Nombre que el cliente te dijo (Opcional: déjalo vacío si no lo dio; el sistema usa su nombre de WhatsApp)' },
          correo_cliente: { type: SchemaType.STRING, description: 'Correo electrónico del cliente (Opcional, puede venir vacío)' },
          tipo_concepto: { type: SchemaType.STRING, description: 'Si el proyecto es un producto del catálogo (ej. Termos, libretas) manda "REVENTA". Si es material suelto manda "CORTE" o "GRABADO".' },
          descripcion_concepto: { type: SchemaType.STRING, description: 'Descripción detallada del concepto (ej. "Termo Space de 550ml con grabado láser")' },
        },
        required: ['project_name', 'material', 'ancho_cm', 'alto_cm', 'cantidad', 'tipo_concepto'],
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

    // Duda que el bot no sabe contestar: deja la nota en el chat y avisa al equipo.
    const escalateDoubt = async (duda: string) => {
      // Nota en el chat: el equipo ve qué quedó pendiente y el bot, al releer el historial,
      // sabe que esta duda ya la escaló y no vuelve a mandar el mismo aviso.
      try {
        const dudaNote = await prisma.whatsAppMessage.create({
          data: {
            contactId: contact.id,
            messageId: `duda_${Date.now()}`,
            direction: 'INTERNAL',
            type: 'TEXT',
            content: `${SYSTEM_NOTE_PREFIX}: Ya se avisó al equipo de esta duda del cliente: «${duda}». No vuelvas a avisar por la misma duda; si el cliente insiste y el equipo aún no contesta, dile que sigues esperando la confirmación.`,
            status: 'DELIVERED',
          },
        });
        await notificationEmitter.emit('whatsapp_message', { message: dudaNote, contact });
      } catch (e) {
        console.error('Error guardando la nota de duda avisada:', e);
      }

      if (!contact.name?.includes("Simulador")) {
        const summary = await quickConversationSummary(contact.id);
        await notifyAdmin(
          [
            `❓ ${contact.name || 'Un cliente'} tiene una duda que el bot no pudo resolver`,
            `Tel: +${contact.phone}`,
            `Duda: ${duda}`,
            summary ? `\nResumen:\n${summary}` : '',
            `\nResponder en el chat: ${conversationLink(contact.id)}`,
          ].filter(Boolean).join('\n'),
          conversationPath(contact.id)
        ).catch((e) => console.error('Error avisando duda al equipo:', e));
      }
    };

    let responseText = "";

    try {
      // Fallos transitorios de Gemini (503/429/red): se reintenta antes de rendirse.
      let result: Awaited<ReturnType<typeof model.generateContent>> | undefined;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          result = await model.generateContent({ contents });
          break;
        } catch (e) {
          if (attempt === 3) throw e;
          console.warn(`Gemini falló (intento ${attempt}/3), reintentando:`, e);
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
      if (!result) throw new Error('Gemini no devolvió respuesta');

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
            select: { name: true, model: true, sku: true, unitPrice: true, unitCost: true, provider: true, color: true, image: true, images: true }
          });
          const pricingGlobals = await getProductPricingGlobals();
          const modelMaxCosts = await getModelMaxCostMap();

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

                const caption = `🔥 ${cleanName || prod.name}\n💰 Precio: $${resolveProductUnitPrice(prod, 1, pricingGlobals, modelMaxCosts[modelCostKey(prod)]).unitPrice.toFixed(2)} MXN`;
                
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
                select: { name: true, color: true, stockQuantity: true, unitPrice: true, unitCost: true, model: true, provider: true, image: true },
              })
            : [];
          const pricingGlobals = await getProductPricingGlobals();
          const modelMaxCosts = await getModelMaxCostMap();

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
                const caption = `🔥 ${baseName || match.name} · ${colorLabel}\n💰 Precio: $${resolveProductUnitPrice(match, 1, pricingGlobals, modelMaxCosts[modelCostKey(match)]).unitPrice.toFixed(2)} MXN`;
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
            else byColor.set(color.toLowerCase(), { color, stock: v.stockQuantity, precio: resolveProductUnitPrice(v, 1, pricingGlobals, modelMaxCosts[modelCostKey(v)]).unitPrice });
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

          await escalateDoubt(args.duda);

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
              // La cotización no espera al nombre: si el cliente no lo dio, va el de su perfil de WhatsApp.
              nombre_cliente: args.nombre_cliente || contact.name || '',
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
          
          // 4. Respuesta al cliente. Se redacta con Gemini para que, si en el mismo mensaje venía
          // una duda, también la conteste (antes se perdía tras el texto fijo).
          const quoteRequestedText = `¡Excelente! Ya capturé todos los detalles y se los pasé al taller. En un momento un asesor revisará la información y te enviará la cotización por este medio.`;
          responseText = quoteRequestedText;
          if (result.response.candidates && result.response.candidates[0].content) {
            contents.push(result.response.candidates[0].content);
            contents.push({
              role: 'user',
              parts: [{
                functionResponse: {
                  name: 'notificar_solicitud_cotizacion',
                  response: {
                    solicitud_enviada: true,
                    instruccion: 'Dile al cliente, en una o dos frases, que ya pasaste los detalles al taller y que un asesor revisará la información y le enviará la cotización por este medio. NO des precios ni tiempos. Si en su último mensaje además hizo una pregunta, contéstala brevemente con las reglas de negocio; si no sabes la respuesta, invoca avisar_duda_al_equipo. No menciones herramientas ni notificaciones.',
                  },
                },
              }],
            });
            try {
              const followUp = await model.generateContent({ contents });
              const followCall = followUp.response.functionCalls()?.[0];
              if (followCall?.name === 'avisar_duda_al_equipo') {
                toolsUsed.push(followCall.name);
                await escalateDoubt(String((followCall.args as { duda?: string })?.duda || ''));
                responseText = `${quoteRequestedText} Sobre tu duda, la confirmo con el equipo y te aviso por aquí.`;
              } else if (!followCall) {
                responseText = followUp.response.text() || quoteRequestedText;
              }
            } catch (e) {
              console.error('Error redactando respuesta de solicitud de cotización:', e);
            }
          }
        }
      } else {
        responseText = result.response.text();
      }

      if (!responseText) {
        responseText = "Entendido. ¿Tienes alguna otra duda o te puedo ayudar con algo más?";
      }
    } catch (error: any) {
      console.error("Error crítico en Gemini (main):", error);
      // Nunca se le manda un mensaje de error al cliente: se avisa al equipo y el bot
      // retoma solo con el siguiente mensaje del cliente (botMode se queda activo).
      await reportBotFailure(contact, error);
      return;
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
        aiTrace: JSON.stringify({ rules: rag.sources, tools: toolsUsed, upTo: lastSeenInboundId }),
      }
    });

    const pusherMessage = { ...savedMessage };
    if (pusherMessage.mediaUrl && pusherMessage.mediaUrl.length > 5000) {
      pusherMessage.mediaUrl = 'FETCH_REQUIRED';
    }
    await notificationEmitter.emit('whatsapp_message', { message: pusherMessage, contact });
    
  } catch (error) {
    console.error("Error en processAIAgentResponse:", error);
    const failed = await prisma.whatsAppContact.findUnique({ where: { id: contactId } }).catch(() => null);
    if (failed) await reportBotFailure(failed, error);
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

