export type QuickReply = { id: string; shortcut: string; title: string; content: string };

export const QUICK_REPLY_LIMITS = { shortcut: 40, title: 80, content: 4000 } as const;

/** "/Dirección " -> "direccion": sin diagonal, sin acentos, minúsculas y solo letras, números, guion y guion bajo. */
export function normalizeShortcut(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^\/+/, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, QUICK_REPLY_LIMITS.shortcut);
}

/** Si el texto de la caja empieza con "/", devuelve lo escrito tras la diagonal (sin espacios); si no, null. */
export function slashQuery(input: string): string | null {
  const m = /^\/([^\s]*)$/.exec(input);
  return m ? normalizeShortcut(m[1]) : null;
}

/** Filtra por atajo o título; sin búsqueda devuelve todas. */
export function filterQuickReplies(list: QuickReply[], query: string): QuickReply[] {
  const q = normalizeShortcut(query);
  if (!q) return list;
  const qt = query.toLowerCase();
  return list.filter((r) => r.shortcut.includes(q) || r.title.toLowerCase().includes(qt));
}

export type QuickReplyInput = { shortcut: string; title: string; content: string };

/** Valida y limpia lo que escribe el usuario. Devuelve el error en español o los datos limpios. */
export function validateQuickReply(input: QuickReplyInput): { error: string } | { data: QuickReplyInput } {
  const shortcut = normalizeShortcut(input.shortcut);
  const title = input.title.trim();
  const content = input.content.trim();
  if (!shortcut) return { error: 'El atajo es obligatorio (solo letras, números y guiones).' };
  if (!title) return { error: 'Ponle un título para reconocerla en la lista.' };
  if (!content) return { error: 'El mensaje no puede estar vacío.' };
  if (title.length > QUICK_REPLY_LIMITS.title) return { error: `El título admite hasta ${QUICK_REPLY_LIMITS.title} caracteres.` };
  if (content.length > QUICK_REPLY_LIMITS.content) return { error: `El mensaje admite hasta ${QUICK_REPLY_LIMITS.content} caracteres.` };
  return { data: { shortcut, title, content } };
}
