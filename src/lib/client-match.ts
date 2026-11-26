// Lógica pura: a qué cliente registrado corresponde una cotización que viene de un chat.
import { normalizeText } from '@/lib/product-match';

export type KnownClient = { id: string; name: string; email?: string | null; phone?: string | null };

export type ClientHints = { linkedClientId?: string | null; email?: string | null; phone?: string | null; name?: string | null };

const lastDigits = (s?: string | null) => {
  const digits = (s ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
};
const cleanName = (s?: string | null) => normalizeText(s ?? '').replace(/\s+/g, ' ').trim();

/**
 * En orden: el ligado al chat, mismo correo, mismo teléfono y, al final, nombre completo idéntico.
 * Nunca por parecido, y si hay más de un candidato no elige ninguno.
 */
export function findQuoteClient<T extends KnownClient>(clients: T[], hints: ClientHints): T | null {
  const linked = clients.find((c) => c.id === hints.linkedClientId);
  if (linked) return linked;

  const only = (matches: T[]) => (matches.length === 1 ? matches[0] : null);
  const email = hints.email?.trim().toLowerCase();
  const phone = lastDigits(hints.phone);
  const name = cleanName(hints.name);

  return (
    (email ? only(clients.filter((c) => c.email?.trim().toLowerCase() === email)) : null) ??
    (phone ? only(clients.filter((c) => lastDigits(c.phone) === phone)) : null) ??
    // Un nombre solo ("Ana") es muy común: se exige nombre y apellido.
    (name.includes(' ') ? only(clients.filter((c) => cleanName(c.name) === name)) : null)
  );
}
