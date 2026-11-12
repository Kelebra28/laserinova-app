/**
 * Protocolo de las notas internas del chat (mensajes con direction INTERNAL).
 * El texto visible va antes de `|||` y el dato para el botón va entre `|||…|||`:
 *   - `|||QUOTE:<id>|||`          → la cotización ya existe ("Ver Cotización").
 *   - `|||<json urlencoded>|||`   → borrador del bot con datos para prellenar una cotización nueva.
 * Lo usan el servidor (quien escribe la nota) y el chat (quien la pinta). Seguro para el cliente.
 */

const SEPARATOR = '|||';
const QUOTE_PREFIX = 'QUOTE:';

/** Datos que el bot (Chalán) junta para prellenar /dashboard/quotes/new. */
export type QuoteDraftData = {
  project?: string;
  material?: string;
  width?: number | string;
  height?: number | string;
  qty?: number | string;
  estimatedTimeMin?: number | string;
  name?: string;
  email?: string;
  type?: string;
  description?: string;
};

export type InternalMessageLink =
  | { kind: 'quote'; quoteId: string }
  | { kind: 'draft'; data: QuoteDraftData };

export function encodeQuoteLink(quoteId: string): string {
  return `${SEPARATOR}${QUOTE_PREFIX}${quoteId}${SEPARATOR}`;
}

export function encodeQuoteDraft(data: QuoteDraftData): string {
  return `${SEPARATOR}${encodeURIComponent(JSON.stringify(data))}${SEPARATOR}`;
}

/** Separa el texto visible del dato del botón. Un JSON roto se ignora (queda solo el texto). */
export function parseInternalMessage(content: string | null | undefined): { text: string; link: InternalMessageLink | null } {
  const parts = (content ?? '').split(SEPARATOR);
  const text = parts[0] ?? '';
  const payload = parts[1];
  if (!payload) return { text, link: null };
  if (payload.startsWith(QUOTE_PREFIX)) return { text, link: { kind: 'quote', quoteId: payload.slice(QUOTE_PREFIX.length) } };
  try {
    return { text, link: { kind: 'draft', data: JSON.parse(decodeURIComponent(payload)) as QuoteDraftData } };
  } catch {
    return { text, link: null };
  }
}

/** Link a "Nueva cotización" con los datos del borrador (mismos parámetros que lee quotes/new). */
export function buildNewQuoteUrl(contactId: string, data: QuoteDraftData, msgId?: string): string {
  let q = `?contactId=${contactId}`;
  if (data.project) q += `&project=${encodeURIComponent(data.project)}`;
  if (data.material) q += `&material=${encodeURIComponent(data.material)}`;
  if (data.width) q += `&w=${data.width}`;
  if (data.height) q += `&h=${data.height}`;
  if (data.qty) q += `&qty=${data.qty}`;
  if (data.estimatedTimeMin) q += `&t=${data.estimatedTimeMin}`;
  if (data.name) q += `&name=${encodeURIComponent(data.name)}`;
  if (data.email) q += `&email=${encodeURIComponent(data.email)}`;
  if (data.type) q += `&type=${encodeURIComponent(data.type)}`;
  if (data.description) q += `&desc=${encodeURIComponent(data.description)}`;
  if (msgId) q += `&msgId=${msgId}`;
  return `/dashboard/quotes/new${q}`;
}
