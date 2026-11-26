/** Ajustes del chat de WhatsApp. */

const MB = 1024 * 1024;

/** Vercel corta cualquier petición mayor a ~4.5 MB; se deja margen para el resto del formulario. */
export const CHAT_MAX_UPLOAD_BYTES = 4 * MB;
export const CHAT_MAX_UPLOAD_LABEL = '4 MB';

export const CHAT_IMAGE_COMPRESSION = {
  /** JPG/PNG por debajo de este peso se mandan tal cual. */
  skipBelowBytes: 1 * MB,
  /** Lado más largo en píxeles. */
  maxSide: 2560,
  quality: 0.85,
  /** Intentos extra, cada uno más chico, si aún no cabe. */
  maxAttempts: 4,
  shrinkFactor: 0.75,
} as const;

/** A menos de esta distancia del final se considera que estás "abajo" y el chat sigue a los mensajes nuevos. */
export const CHAT_STICK_THRESHOLD_PX = 80;

export const CHAT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

/** Prefijo de los mensajes que se pintan antes de que el servidor confirme el envío. */
export const OPTIMISTIC_ID_PREFIX = 'opt_';
