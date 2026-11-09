import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { notificationEmitter } from '@/lib/notification-emitter';
import { createQuickQuoteService } from '@/server/services/quote.service';
import {
  sendMessageToMeta,
  sendQuotePdfToClient,
  processAIAgentResponse,
  isAdminPhone,
  quoteLink,
} from '@/server/services/whatsapp.service';

/**
 * Bot de gestión: los administradores (ADMIN_ALERT_PHONE) le escriben al número del bot para
 * pedir cotizaciones ("cotízale a Sara 220 navajas a $45 c/u"). El bot NUNCA manda nada al
 * cliente por su cuenta: crea un borrador, se lo muestra al administrador y solo lo envía
 * cuando el administrador responde AUTORIZAR.
 *
 * Estado del flujo, guardado como mensajes INTERNAL en el chat del administrador:
 *   [PENDIENTE] <quoteId>  borrador esperando autorización
 *   [RESUELTA] <quoteId>   ya se envió o se descartó
 */

const PENDING = '[PENDIENTE]';
const RESOLVED = '[RESUELTA]';
const IVA = 0.16;

type AdminContact = { id: string; phone: string; name: string | null };

const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function replyToAdmin(admin: AdminContact, text: string) {
  let messageId = `admin_reply_${Date.now()}`;
  try {
    const res = await sendMessageToMeta(admin.phone, { type: 'text', text: { body: text } });
    if (res?.messages?.[0]?.id) messageId = res.messages[0].id;
  } catch (e) {
    console.error('No se pudo responder al administrador:', e);
  }
  const saved = await prisma.whatsAppMessage.create({
    data: { contactId: admin.id, messageId, direction: 'OUTBOUND', type: 'TEXT', content: text, status: 'SENT' },
  });
  await notificationEmitter.emit('whatsapp_message', { message: saved, contact: admin }).catch(() => {});
}

async function setMarker(adminId: string, kind: typeof PENDING | typeof RESOLVED, quoteId: string) {
  await prisma.whatsAppMessage.create({
    data: {
      contactId: adminId,
      messageId: `admin_marker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      direction: 'INTERNAL',
      type: 'TEXT',
      content: `${kind} ${quoteId}`,
      status: 'DELIVERED',
    },
  });
}

/** Id del borrador que espera autorización (el marcador más reciente, si es PENDIENTE). */
async function getPendingQuoteId(adminId: string): Promise<string | null> {
  const last = await prisma.whatsAppMessage.findFirst({
    where: {
      contactId: adminId,
      direction: 'INTERNAL',
      OR: [{ content: { startsWith: PENDING } }, { content: { startsWith: RESOLVED } }],
    },
    orderBy: { timestamp: 'desc' },
    select: { content: true },
  });
  if (!last?.content?.startsWith(PENDING)) return null;
  return last.content.slice(PENDING.length).trim() || null;
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// Solo frases completas y claras: "sí pero cámbiale el precio" NO autoriza.
const AUTHORIZE = /^(si |ok |dale |va )?(autorizar|autorizo|autorizada|autorizado|mandala|mandalo|envia|enviala|enviarla|envialo|mandala al cliente|enviala al cliente|dale|ok|si|va)$/;
const CANCEL = /^(cancelar|cancela|cancelala|descartar|descartala|no la mandes|no)$/;

async function getBillingUserId(): Promise<string> {
  const user =
    (await prisma.user.findFirst({ where: { role: 'ADMIN', active: true }, orderBy: { createdAt: 'asc' } })) ||
    (await prisma.user.findFirst({ where: { active: true }, orderBy: { createdAt: 'asc' } }));
  if (!user) throw new Error('No hay usuarios activos para asignar la cotización.');
  return user.id;
}

const buscar_cliente: FunctionDeclaration = {
  name: 'buscar_cliente',
  description: 'Busca clientes de WhatsApp por nombre o teléfono (los más recientes primero). Úsala siempre antes de crear una cotización para obtener el contact_id del cliente. Si hay varios que podrían ser, pregúntale al administrador cuál es.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: { consulta: { type: SchemaType.STRING, description: 'Nombre (o parte) o teléfono del cliente. Vacío para ver los chats más recientes.' } },
    required: ['consulta'],
  },
};

const crear_borrador_cotizacion: FunctionDeclaration = {
  name: 'crear_borrador_cotizacion',
  description: 'Crea un BORRADOR de cotización con el precio que dicta el administrador. NO se envía al cliente: el administrador debe autorizarlo después. Úsala solo cuando tengas cliente (contact_id), cantidad y precio unitario claros; si falta algo, pregúntalo.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      contact_id: { type: SchemaType.STRING, description: 'id del cliente, tomado de buscar_cliente' },
      proyecto: { type: SchemaType.STRING, description: 'Nombre corto del proyecto (ej. "Navajas grabadas")' },
      descripcion: { type: SchemaType.STRING, description: 'Descripción del concepto para el cliente (ej. "Navaja multifuncional de metal con grabado láser")' },
      cantidad: { type: SchemaType.INTEGER, description: 'Número de piezas' },
      precio_unitario: { type: SchemaType.NUMBER, description: 'Precio por pieza en MXN que dictó el administrador' },
      precio_incluye_iva: { type: SchemaType.BOOLEAN, description: 'true solo si el administrador dijo que el precio ya incluye IVA; si no lo dijo, false' },
    },
    required: ['contact_id', 'proyecto', 'descripcion', 'cantidad', 'precio_unitario'],
  },
};

const SYSTEM_PROMPT = `Eres el asistente interno de Laser Inova. Hablas con un ADMINISTRADOR (dueño del negocio), no con un cliente.
Tu trabajo: cuando el administrador te dicte una cotización (cliente, cantidad y precio), la conviertes en un borrador.
Reglas:
- Respuestas cortas, en español de México, tono directo.
- Para saber de qué cliente habla, usa buscar_cliente. Si hay más de un posible, o ninguno, pregúntale cuál.
- Si falta cantidad, precio o descripción del producto, pregúntalo. No inventes precios.
- Después de crear el borrador no digas nada más: el sistema le mostrará el resumen y le pedirá autorizar.
- NUNCA envías nada al cliente; eso solo pasa cuando el administrador responde AUTORIZAR.
- Si te pide algo fuera de cotizaciones, dile brevemente que por ahora solo cotizas.`;

async function runAdminAgent(admin: AdminContact, text: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    await replyToAdmin(admin, '⚠️ No tengo GEMINI_API_KEY configurada, no puedo procesar tu instrucción.');
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: [buscar_cliente, crear_borrador_cotizacion] }],
  });

  // Historial reciente de la charla con el administrador (sin los marcadores internos)
  const recent = (
    await prisma.whatsAppMessage.findMany({
      where: { contactId: admin.id, direction: { in: ['INBOUND', 'OUTBOUND'] }, type: 'TEXT' },
      orderBy: { timestamp: 'desc' },
      take: 10,
    })
  ).reverse();
  const contents: any[] = [];
  for (const m of recent) {
    const role = m.direction === 'INBOUND' ? 'user' : 'model';
    if (!m.content) continue;
    if (contents.length && contents[contents.length - 1].role === role) contents[contents.length - 1].parts[0].text += `\n${m.content}`;
    else contents.push({ role, parts: [{ text: m.content }] });
  }
  if (!contents.length || contents[contents.length - 1].role !== 'user') contents.push({ role: 'user', parts: [{ text }] });

  for (let step = 0; step < 4; step++) {
    const result = await model.generateContent({ contents });
    const call = result.response.functionCalls()?.[0];

    if (!call) {
      await replyToAdmin(admin, result.response.text() || 'No te entendí, ¿me repites la cotización con cliente, cantidad y precio?');
      return;
    }

    if (call.name === 'buscar_cliente') {
      const q = String((call.args as any).consulta || '').trim();
      const digits = q.replace(/\D/g, '');
      const matches = await prisma.whatsAppContact.findMany({
        where: {
          id: { not: admin.id },
          NOT: { name: { contains: 'Simulador' } },
          ...(q ? { OR: [{ name: { contains: q } }, ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : [])] } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      });
      const clients = matches.filter(c => !isAdminPhone(c.phone)).map(c => ({ contact_id: c.id, nombre: c.name, telefono: `+${c.phone}` }));
      if (result.response.candidates?.[0]?.content) contents.push(result.response.candidates[0].content);
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: 'buscar_cliente', response: { clientes: clients, nota: clients.length ? undefined : 'No hay coincidencias.' } } }],
      });
      continue;
    }

    if (call.name === 'crear_borrador_cotizacion') {
      await createDraft(admin, call.args as any);
      return;
    }
  }

  await replyToAdmin(admin, 'No logré armar la cotización, ¿me la dictas completa? (cliente, cantidad y precio por pieza)');
}

async function createDraft(admin: AdminContact, args: any) {
  const contact = await prisma.whatsAppContact.findUnique({ where: { id: String(args.contact_id) } });
  if (!contact || isAdminPhone(contact.phone)) {
    await replyToAdmin(admin, 'No encontré a ese cliente, ¿me das su nombre o teléfono?');
    return;
  }
  const qty = Math.max(1, Math.round(Number(args.cantidad) || 0));
  const unit = Number(args.precio_unitario);
  if (!qty || !(unit > 0)) {
    await replyToAdmin(admin, 'Necesito cantidad y precio por pieza para armar la cotización.');
    return;
  }

  // Un solo borrador pendiente a la vez: el nuevo sustituye al anterior.
  const previous = await getPendingQuoteId(admin.id);
  if (previous) {
    await prisma.quote.updateMany({ where: { id: previous, status: 'DRAFT' }, data: { active: false } });
    await setMarker(admin.id, RESOLVED, previous);
  }

  const gross = round2(qty * unit);
  const includesIva = args.precio_incluye_iva === true;
  const subtotal = includesIva ? round2(gross / (1 + IVA)) : gross;
  const tax = includesIva ? round2(gross - subtotal) : round2(subtotal * IVA);
  const total = round2(subtotal + tax);
  const clientName = contact.name || `+${contact.phone}`;

  const userId = await getBillingUserId();
  const quoteId = await createQuickQuoteService(userId, {
    clientId: contact.clientId || null,
    client: { name: clientName },
    project: String(args.proyecto || 'Cotización'),
    description: String(args.descripcion || ''),
    subtotal,
    tax,
    total,
    concepts: [{
      description: String(args.descripcion || args.proyecto || 'Concepto'),
      quantity: qty,
      unitPrice: round2(subtotal / qty),
      totalAmount: subtotal,
      margin: 0,
    }],
  });
  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: { contactId: contact.id, status: 'DRAFT' },
    select: { folio: true },
  });
  await setMarker(admin.id, PENDING, quoteId);

  await replyToAdmin(
    admin,
    [
      `📝 Borrador ${quote.folio} para ${clientName}`,
      `• ${args.descripcion}`,
      `• ${qty} pzas × ${money(round2(subtotal / qty))} = ${money(subtotal)} + IVA ${money(tax)}`,
      `*Total: ${money(total)}*`,
      '',
      'Responde *AUTORIZAR* y se la mando al cliente, *CANCELAR* para descartarla, o dime qué cambiar.',
      quoteLink(quoteId),
    ].join('\n')
  );
}

async function authorizePending(admin: AdminContact, quoteId: string) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { id: true, status: true, active: true, folio: true } });
  if (!quote || !quote.active || quote.status !== 'DRAFT') {
    await setMarker(admin.id, RESOLVED, quoteId);
    await replyToAdmin(admin, 'Ese borrador ya no está disponible. Dime la cotización otra vez y la armo.');
    return;
  }
  try {
    const { contact, folio, total } = await sendQuotePdfToClient(quoteId);
    await prisma.quote.update({ where: { id: quoteId }, data: { status: 'APPROVED', sentDate: new Date() } });
    await setMarker(admin.id, RESOLVED, quoteId);
    await replyToAdmin(admin, `✅ Cotización ${folio} (${money(total)}) enviada a ${contact.name || `+${contact.phone}`}.`);
    if (contact.botMode) await processAIAgentResponse(contact.id).catch(console.error);
  } catch (e: any) {
    // El borrador sigue pendiente: se puede reintentar con AUTORIZAR.
    await replyToAdmin(admin, `⚠️ No se pudo enviar ${quote.folio}: ${e?.message || 'error desconocido'}\nSigue como borrador, puedes responder AUTORIZAR para reintentar.`);
  }
}

/** Atiende un mensaje de texto de un administrador. Nunca lanza: cualquier falla se le avisa al propio administrador. */
export async function handleAdminMessage(admin: AdminContact, text: string) {
  try {
    const t = norm(text);
    const pendingId = await getPendingQuoteId(admin.id);

    if (pendingId && AUTHORIZE.test(t)) return await authorizePending(admin, pendingId);

    if (pendingId && CANCEL.test(t)) {
      await prisma.quote.updateMany({ where: { id: pendingId, status: 'DRAFT' }, data: { active: false } });
      await setMarker(admin.id, RESOLVED, pendingId);
      return await replyToAdmin(admin, '🗑️ Borrador descartado. No se envió nada al cliente.');
    }

    await runAdminAgent(admin, text);
  } catch (e: any) {
    console.error('Error en el bot de gestión:', e);
    await replyToAdmin(admin, `⚠️ Algo falló al procesar tu mensaje (${String(e?.message || e).slice(0, 150)}). Nada se envió al cliente. Intenta de nuevo.`).catch(() => {});
  }
}
