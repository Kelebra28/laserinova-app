/**
 * Formato de las notas de voz grabadas en el chat.
 * WhatsApp (Meta) acepta audio/ogg (opus), audio/mp4, audio/aac, audio/mpeg y audio/amr, pero NO audio/webm,
 * que es lo que Chrome graba por defecto. Antes todo se etiquetaba como webm, aunque Safari/iPhone grabe mp4.
 */

/** En orden de preferencia: ogg/opus (Firefox) se ve como nota de voz; mp4 lo graban Safari y Chrome. */
const PREFERRED_TYPES = ['audio/ogg;codecs=opus', 'audio/mp4'];

/** Tipo para `new MediaRecorder(stream, { mimeType })`; undefined = el default del navegador. */
export function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return undefined;
  return PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

const EXTENSIONS: Record<string, string> = {
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/mpeg': 'mp3',
  'audio/webm': 'webm',
};

/** Tipo base (sin `;codecs=`) y extensión para el archivo que se sube. */
export function audioFileInfo(recordedType: string | undefined): { mimeType: string; extension: string } {
  const base = (recordedType || 'audio/webm').split(';')[0].trim().toLowerCase();
  const mimeType = EXTENSIONS[base] ? base : 'audio/webm';
  return { mimeType, extension: EXTENSIONS[mimeType] };
}
