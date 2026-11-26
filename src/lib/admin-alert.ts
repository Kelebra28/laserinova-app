// Lógica pura de los avisos por WhatsApp a los administradores (sin BD ni envíos).

/** La variable de la plantilla se recorta aquí: Meta limita el tamaño del cuerpo completo. */
export const TEMPLATE_VAR_MAX_CHARS = 900;

/** Lo que no se puede perder al recortar: las ligas y cómo autorizar un borrador. */
const KEY_LINE = /https?:\/\/|AUTORIZAR/;

/**
 * Convierte un aviso en la variable de la plantilla: las variables no admiten saltos de línea ni más de
 * 3 espacios seguidos. Si no cabe, las líneas clave suben después del título para que sobrevivan al recorte.
 */
export function toTemplateVariable(text: string, max: number = TEMPLATE_VAR_MAX_CHARS): string {
  const lines = text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const full = lines.join(' | ');
  if (full.length <= max) return full;
  const [title, ...rest] = lines;
  const ordered = [title, ...rest.filter((l) => KEY_LINE.test(l)), ...rest.filter((l) => !KEY_LINE.test(l))].join(' | ');
  return ordered.length <= max ? ordered : `${ordered.slice(0, max - 1)}…`;
}
