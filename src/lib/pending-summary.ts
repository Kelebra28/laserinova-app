// Lógica pura del resumen de pendientes de WhatsApp para los administradores (sin BD ni envíos).

export type PendingKind = 'waiting' | 'quote' | 'doubt';

export type PendingItem = {
  contactId: string;
  name: string;
  phone: string;
  kind: PendingKind;
  /** Desde cuándo está pendiente. */
  since: Date;
  detail: string;
};

export type PendingMessage = {
  direction: string;
  type: string;
  content: string | null;
  timestamp: Date;
  aiTrace: string | null;
};

export type PendingContact = { id: string; name: string | null; phone: string; messages: PendingMessage[] };

export const PENDING_GROUPS: { kind: PendingKind; icon: string; label: string }[] = [
  { kind: 'waiting', icon: '🔴', label: 'Esperan respuesta' },
  { kind: 'quote', icon: '🟡', label: 'Cotizaciones por enviar' },
  { kind: 'doubt', icon: '🟠', label: 'Dudas que avisó el bot' },
];

/** Un "gracias", "ok" o emoji solo no es un pendiente. */
const CLOSING = /^((ok(ey|i)?|oki|vale|va|listo|perfecto|excelente|enterado|gracias|muchas gracias|mil gracias|muy amable|de nada|igualmente|saludos|bonito d[ií]a|quedo (atent[oa]|(super )?pendiente|en espera)|s[ií],? gracias|👍🏻|👍|🙏|😊|☺️|🎭 sticker)[\s,.!¡]*)+$/i;

const QUOTE_SENT_TEXT = /(comparto|env[ií]o|anexo|te mando)[^.]{0,40}cotizaci[oó]n|cotizaci[oó]n solicitada/i;

function waitingDetail(m: PendingMessage): string {
  if (m.type === 'DOCUMENT') return `mandó archivo ${(m.content || '').slice(0, 35)}`.trim();
  if (m.type === 'IMAGE') return 'mandó una imagen';
  if (m.type === 'AUDIO') return 'mandó un audio';
  const text = (m.content || '').replace(/^↪️ En respuesta a «[^»]*»\s*/, '').replace(/\s+/g, ' ').trim();
  return `"${text.slice(0, 45)}${text.length > 45 ? '…' : ''}"`;
}

/** Devuelve el pendiente más urgente del contacto (uno solo por cliente) o null si no tiene. */
export function classifyContact(contact: PendingContact): PendingItem | null {
  const msgs = [...contact.messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const base = { contactId: contact.id, name: contact.name?.trim() || 'Sin nombre', phone: contact.phone };
  const visible = msgs.filter((m) => m.direction !== 'INTERNAL' && m.type !== 'REACTION');
  const isHuman = (m: PendingMessage) => m.direction === 'OUTBOUND' && !m.aiTrace;

  // 1. El cliente escribió al final y nadie le contestó. Cuenta desde su primer mensaje sin respuesta.
  const lastOutIdx = visible.map((m) => m.direction).lastIndexOf('OUTBOUND');
  const unanswered = visible.slice(lastOutIdx + 1).filter((m) => !CLOSING.test((m.content || '').trim()));
  if (unanswered.length > 0) {
    return { ...base, kind: 'waiting', since: unanswered[0].timestamp, detail: waitingDetail(unanswered[unanswered.length - 1]) };
  }

  // 2. El bot pidió la cotización y no se ve que se haya enviado.
  const request = [...msgs].reverse().find((m) => m.aiTrace?.includes('notificar_solicitud_cotizacion'));
  if (request) {
    const sent = visible.some(
      (m) =>
        m.timestamp > request.timestamp &&
        m.direction === 'OUTBOUND' &&
        (/^Cotizaci[oó]n LI-/i.test(m.content || '') || (isHuman(m) && (m.type === 'DOCUMENT' || QUOTE_SENT_TEXT.test(m.content || '')))),
    );
    if (!sent) return { ...base, kind: 'quote', since: request.timestamp, detail: 'cotización sin enviar' };
  }

  // 3. El bot avisó una duda o pidió un humano y después no ha escrito nadie del equipo.
  const note = [...msgs].reverse().find((m) => m.direction === 'INTERNAL' && /Ya se avisó al equipo/i.test(m.content || ''));
  if (note && !msgs.some((m) => isHuman(m) && m.timestamp > note.timestamp)) {
    const reason = /«([^»]*)»|\(motivo: ([^)]*)\)/i.exec(note.content || '');
    return { ...base, kind: 'doubt', since: note.timestamp, detail: (reason?.[1] || reason?.[2] || 'duda sin atender').slice(0, 60) };
  }

  return null;
}

/** 5215512345678 -> "+52 55 1234 5678" (WhatsApp lo vuelve tocable). */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const mx = /^521?(\d{10})$/.exec(digits);
  if (!mx) return `+${digits}`;
  const n = mx[1];
  return /^(55|56|33|81)/.test(n)
    ? `+52 ${n.slice(0, 2)} ${n.slice(2, 6)} ${n.slice(6)}`
    : `+52 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
}

export function formatAge(since: Date, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - since.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} h` : `${Math.floor(hours / 24)} d`;
}

/** Del más viejo al más nuevo: primero quien lleva más tiempo esperando. */
export const sortByOldest = (items: PendingItem[]) => [...items].sort((a, b) => a.since.getTime() - b.since.getTime());

/** Texto de WhatsApp admite 4096 caracteres. */
export const SUMMARY_MAX_CHARS = 3800;

/**
 * Mensaje para los administradores. La liga va en la segunda línea para que sobreviva si WhatsApp lo manda
 * como plantilla (que se recorta). El espacio se reparte por turnos entre grupos, empezando por los urgentes.
 */
export function buildSummaryMessage(items: PendingItem[], opts: { now: Date; link: string; maxChars?: number }): string {
  const max = opts.maxChars ?? SUMMARY_MAX_CHARS;
  const groups = PENDING_GROUPS.map((g) => ({ ...g, all: sortByOldest(items.filter((i) => i.kind === g.kind)), shown: [] as string[] }))
    .filter((g) => g.all.length > 0);

  const header = [`📋 Pendientes por contestar: ${items.length}`, `Ver todos: ${opts.link}`];
  const render = () =>
    [
      ...header,
      ...groups.flatMap((g) => {
        const rest = g.all.length - g.shown.length;
        return ['', `${g.icon} ${g.label} (${g.all.length})`, ...g.shown, ...(rest > 0 ? [`…y ${rest} más en la liga`] : [])];
      }),
    ].join('\n');

  // Grupo por grupo en orden de urgencia: los urgentes se llenan primero.
  for (const g of groups) {
    for (const item of g.all) {
      const detail = g.kind === 'quote' ? '' : ` · ${item.detail}`;
      g.shown.push(`• ${item.name} · ${formatPhone(item.phone)} · ${formatAge(item.since, opts.now)}${detail}`);
      if (render().length > max) { g.shown.pop(); break; }
    }
  }
  return render();
}
