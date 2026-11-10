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
  notifyAdmin,
} from '@/server/services/whatsapp.service';
import type { ChalanPricing } from '@/lib/agents/chalan';

/**
 * Bot de gestión: los administradores (ADMIN_ALERT_PHONE) le escriben al número del bot para
 * pedir cotizaciones ("cotízale a Sara 220 navajas a $45 c/u"). El bot NUNCA manda nada al
 * cliente por su cuenta: crea un borrador, se lo muestra al administrador y solo lo envía
 * cuando el administrador responde AUTORIZAR.
 *
 * Los borradores también nacen solos: cuando el bot de clientes junta los datos y el Chalán saca
 * un precio confiable, proposeAutoDraft crea el borrador y se lo manda a los administradores.
 * Puede haber varios pendientes a la vez; con más de uno se autoriza por folio (AUTORIZAR 0123).
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

async function setMarker(adminId: string, kind: typeof PENDING | typeof RESOLVED, quoteId: string, auto = false) {
  await prisma.whatsAppMessage.create({
    data: {
      contactId: adminId,
      messageId: `admin_marker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      direction: 'INTERNAL',
      type: 'TEXT',
      content: `${kind} ${quoteId}${auto ? ' auto' : ''}`,
      status: 'DELIVERED',
    },
  });
}

// auto: el borrador lo armó el bot de clientes (no lo dictó el administrador).
type PendingQuote = { id: string; folio: string; project: string | null; total: number; contactId: string | null; auto: boolean };

/**
 * Borradores que esperan autorización de este administrador, del más reciente al más antiguo.
 * Se descartan los que ya resolvió él (marcador RESUELTA) y los que ya no son borrador
 * (otro administrador los envió o descartó, o se cambiaron desde el CRM).
 */
async function getPendingQuotes(adminId: string): Promise<PendingQuote[]> {
  const markers = await prisma.whatsAppMessage.findMany({
    where: {
      contactId: adminId,
      direction: 'INTERNAL',
      OR: [{ content: { startsWith: PENDING } }, { content: { startsWith: RESOLVED } }],
    },
    orderBy: { timestamp: 'desc' },
    take: 60,
    select: { content: true },
  });
  const seen = new Set<string>();
  const ids: string[] = [];
  const autoIds = new Set<string>();
  for (const m of markers) {
    const content = m.content || '';
    const isPending = content.startsWith(PENDING);
    const [id, flag] = content.slice(isPending ? PENDING.length : RESOLVED.length).trim().split(/\s+/);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (isPending) ids.push(id);
    if (isPending && flag === 'auto') autoIds.add(id);
  }
  if (!ids.length) return [];
  const quotes = await prisma.quote.findMany({
    where: { id: { in: ids }, status: 'DRAFT', active: true },
    select: { id: true, folio: true, project: true, total: true, contactId: true },
  });
  return ids.flatMap(id => quotes.filter(q => q.id === id).map(q => ({ ...q, auto: autoIds.has(id) })));
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// Solo frases completas y claras: "sí pero cámbiale el precio" NO autoriza.
const AUTHORIZE = /^(si |ok |dale |va )?(autorizar|autorizo|autorizada|autorizado|mandala|mandalo|envia|enviala|enviarla|envialo|mandala al cliente|enviala al cliente|dale|ok|si|va)$/;
const CANCEL = /^(cancelar|cancela|cancelala|descartar|descartala|no la mandes|no)$/;
// Un "ok" o un "no" sueltos bastan para un borrador que el administrador acaba de dictar, pero no
// para uno que armó el bot y llegó sin pedirlo: ahí podrían ser respuesta a otra cosa.
const LOOSE = /^(si|ok|va|dale|no)$/;

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

  // Un solo borrador pendiente por cliente: el nuevo sustituye al anterior de ese mismo cliente.
  await discardPendingFor(admin.id, contact.id);

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

/** Descarta los borradores pendientes de este administrador que sean del mismo cliente. */
async function discardPendingFor(adminId: string, contactId: string) {
  const previous = (await getPendingQuotes(adminId)).filter(q => q.contactId === contactId);
  for (const q of previous) {
    await prisma.quote.updateMany({ where: { id: q.id, status: 'DRAFT' }, data: { active: false } });
    await setMarker(adminId, RESOLVED, q.id);
  }
}

/** Contactos de WhatsApp de los administradores (ADMIN_ALERT_PHONE) que ya le han escrito al bot. */
async function getAdminContacts() {
  const tails = (process.env.ADMIN_ALERT_PHONE || '')
    .split(',')
    .map(p => p.replace(/\D/g, '').slice(-10))
    .filter(p => p.length === 10);
  if (!tails.length) return [];
  return prisma.whatsAppContact.findMany({ where: { OR: tails.map(t => ({ phone: { endsWith: t } })) } });
}

/**
 * Borrador automático: el bot de clientes ya tiene los datos y el Chalán calculó un precio
 * confiable. Se crea la cotización como borrador y se manda el resumen a los administradores,
 * que la envían al cliente respondiendo AUTORIZAR. Nunca se envía sola.
 * Lanza si no se pudo crear, para que quien llama mande el aviso normal de solicitud.
 */
export async function proposeAutoDraft(params: {
  contact: { id: string; name: string | null; phone: string; clientId?: string | null };
  project: string;
  description?: string;
  designIncluded?: boolean;
  pricing: ChalanPricing;
  chatLink: string;
  chatPath: string;
}) {
  const { contact, pricing } = params;
  const qty = Math.max(1, Math.round(pricing.quantity));
  const subtotal = round2(pricing.subtotal);
  const tax = round2(subtotal * (pricing.ivaPct / 100));
  const total = round2(subtotal + tax);
  const unit = round2(subtotal / qty);
  const marginPct = subtotal > 0 ? Math.max(0, round2((1 - pricing.realCost / subtotal) * 100)) : 0;
  const clientName = contact.name || `+${contact.phone}`;
  const work = `${pricing.tipo === 'GRABADO' ? 'Grabado' : 'Corte'} láser en ${pricing.materialName}, ${pricing.widthCm} × ${pricing.heightCm} cm`;
  const detail = (params.description || '').trim();
  const conceptDescription = detail ? `${detail} (${work})` : work;

  const admins = await getAdminContacts();
  for (const a of admins) await discardPendingFor(a.id, contact.id);

  const userId = await getBillingUserId();
  const quoteId = await createQuickQuoteService(userId, {
    clientId: contact.clientId || null,
    client: { name: clientName },
    project: params.project || 'Cotización',
    description: conceptDescription,
    subtotal,
    tax,
    total,
    concepts: [{ description: conceptDescription, quantity: qty, unitPrice: unit, totalAmount: subtotal, margin: marginPct }],
  });
  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: { contactId: contact.id, status: 'DRAFT' },
    select: { folio: true },
  });

  const text = [
    `📝 *Borrador ${quote.folio}* para ${clientName} (+${contact.phone})`,
    `Proyecto: ${params.project}`,
    `• ${conceptDescription}`,
    `• ${qty} pzas × ${money(unit)} = ${money(subtotal)} + IVA ${money(tax)}`,
    `*Total: ${money(total)}*`,
    `Costo real: ${money(pricing.realCost)} · margen ${pricing.marginPct}% · ${pricing.timeMinPerPiece} min de máquina por pieza`,
    `Diseño del cliente: ${params.designIncluded ? 'sí' : 'no'}`,
    '',
    `El precio lo calculó el bot, revísalo. Responde *AUTORIZAR ${quote.folio}* y se la mando al cliente, o *CANCELAR ${quote.folio}* para descartarla.`,
    `Para cambiarla: ${quoteLink(quoteId)}`,
    `Chat: ${params.chatLink}`,
  ].join('\n');

  // El marcador va antes del aviso: aunque el WhatsApp falle, el borrador queda autorizable.
  for (const a of admins) {
    await setMarker(a.id, PENDING, quoteId, true);
    const saved = await prisma.whatsAppMessage.create({
      data: { contactId: a.id, messageId: `admin_draft_${Date.now()}_${a.id.slice(-4)}`, direction: 'OUTBOUND', type: 'TEXT', content: text, status: 'SENT' },
    });
    await notificationEmitter.emit('whatsapp_message', { message: saved, contact: a }).catch(() => {});
  }
  await notifyAdmin(text, params.chatPath);
  return { quoteId, folio: quote.folio };
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
    const pending = await getPendingQuotes(admin.id);

    // El folio es opcional con un solo borrador y obligatorio con varios: "autorizar LI-2026-0123" o "autorizar 123".
    let command = norm(text);
    let target: PendingQuote | undefined;
    for (const q of pending) {
      const full = norm(q.folio);
      const digits = q.folio.match(/(\d+)$/)?.[1] || '';
      const tail = [full, digits, digits.replace(/^0+/, '')].find(f => f && (command === f || command.endsWith(` ${f}`)));
      if (!tail) continue;
      target = q;
      command = command.slice(0, command.length - tail.length).trim();
      break;
    }
    const wantsAuthorize = AUTHORIZE.test(command);
    const wantsCancel = CANCEL.test(command);

    if (pending.length && (wantsAuthorize || wantsCancel)) {
      if (!target && pending.length === 1) target = pending[0];
      if (!target) {
        return await replyToAdmin(
          admin,
          [
            `Tienes ${pending.length} borradores pendientes, ¿cuál?`,
            ...pending.map(q => `• ${q.folio} · ${q.project || 'Cotización'} · ${money(q.total)}`),
            '',
            'Responde con el folio, por ejemplo: *AUTORIZAR ' + pending[0].folio + '*',
          ].join('\n')
        );
      }
      if (target.auto && LOOSE.test(command)) {
        return await replyToAdmin(admin, `Para el borrador ${target.folio} respóndeme *AUTORIZAR* para enviarlo al cliente o *CANCELAR* para descartarlo.`);
      }
      if (wantsAuthorize) return await authorizePending(admin, target.id);
      await prisma.quote.updateMany({ where: { id: target.id, status: 'DRAFT' }, data: { active: false } });
      await setMarker(admin.id, RESOLVED, target.id);
      return await replyToAdmin(admin, `🗑️ Borrador ${target.folio} descartado. No se envió nada al cliente.`);
    }

    await runAdminAgent(admin, text);
  } catch (e: any) {
    console.error('Error en el bot de gestión:', e);
    await replyToAdmin(admin, `⚠️ Algo falló al procesar tu mensaje (${String(e?.message || e).slice(0, 150)}). Nada se envió al cliente. Intenta de nuevo.`).catch(() => {});
  }
}
