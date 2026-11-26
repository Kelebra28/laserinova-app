// Lógica pura: el administrador contesta la duda de un cliente citando el aviso (sin BD ni envíos).
import { normalizeText } from '@/lib/product-match';

export const REPLY_HINT = '↩️ Cita este mensaje con tu respuesta y se la paso al cliente.';

/** "ok", "yo lo veo" o "gracias" son para el equipo, no una respuesta para el cliente. */
const ACKNOWLEDGMENT =
  /^((ok(ey|i)?|oki|va|vale|visto|enterad[oa]|gracias|listo|perfecto|dale|sale|arre|a ver|aguanta|espera|ahorita|ya vi|ya lo (vi|veo|checo|atiendo|contesto)|(ahorita )?(yo )?(lo|la|le) (veo|checo|atiendo|contesto|marco|escribo)|yo me encargo|👍🏻|👍|🙏)[\s,.!]*)+$/;

export const isAcknowledgment = (text: string) => ACKNOWLEDGMENT.test(normalizeText(text).trim());

/** WhatsApp antepone la cita al texto cuando el mensaje citado está guardado en el CRM. */
export const stripQuotedPrefix = (text: string) => text.replace(/^↪️ En respuesta a «[^»]*»\s*/, '').trim();

/** Lo que la redacción no puede sacar de la nada: cifras, precios, ligas, plazos y promesas. */
const COMMITMENTS = [
  /\d+(?:[.,]\d+)*/g,
  /\$|https?:\/\/\S+/g,
  /\b(hoy|manana|pasado manana|lunes|martes|miercoles|jueves|viernes|sabado|domingo|semanas?|dias?|horas?|gratis|sin costo|descuentos?|garantiz\w*|anticipo|envio|incluye\w*)\b/g,
];

/** ¿La redacción agregó algo que no estaba en la respuesta del equipo ni en la duda? */
export function addsCommitments(draft: string, source: string): boolean {
  const base = normalizeText(source);
  return COMMITMENTS.some((pattern) => {
    const allowed = new Set(base.match(pattern) ?? []);
    return (normalizeText(draft).match(pattern) ?? []).some((found) => !allowed.has(found));
  });
}

/** Si el equipo dijo que no y la redacción perdió el "no", no se usa. */
export const dropsNegation = (draft: string, answer: string) => /\bno\b/.test(normalizeText(answer)) && !/\bno\b/.test(normalizeText(draft));

/** Texto del equipo cuando no hay redacción: sin el "dile que" dirigido al bot. */
export function plainReply(answer: string): string {
  const clean = answer.replace(/^\s*(dile|diles|cont[eé]stale|resp[oó]ndele|av[ií]sale)( que)?[\s,:]+/i, '').trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : answer;
}

export function composePrompt(doubt: string, answer: string): string {
  return `Eres el asistente de WhatsApp de Laser Inova (corte y grabado láser). Un cliente tenía esta duda y el equipo te dio la respuesta.
Escribe el mensaje para el cliente: español de México, cálido, corto (máximo 3 frases), sin Markdown.
Reglas estrictas:
- Di solo lo que dice la respuesta del equipo. No agregues precios, cantidades, plazos, fechas, descuentos, garantías ni condiciones.
- No cambies un "no" ni un "depende" por un "sí".
- No menciones que el equipo te dio instrucciones ni copies comentarios internos.
- Si la respuesta ya está bien escrita, cámbiala lo menos posible.
Devuelve únicamente el mensaje.

Duda del cliente: ${doubt}
Respuesta del equipo: ${answer}`;
}
