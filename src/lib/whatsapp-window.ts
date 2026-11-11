/**
 * Ventana de atención de WhatsApp: Meta solo deja mandar texto libre durante las 24 h
 * siguientes al último mensaje del cliente. Fuera de esa ventana el mensaje se rechaza
 * (error 131047) y hay que usar una plantilla aprobada o esperar a que el cliente escriba.
 * Este archivo es seguro para el cliente (no toca la base de datos).
 */

export const WINDOW_MS = 24 * 60 * 60 * 1000;
/** A partir de aquí la ventana se considera "por cerrarse". */
export const WINDOW_WARNING_MS = 3 * 60 * 60 * 1000;

export type WindowState =
  | { kind: 'unknown' }
  | { kind: 'open'; remainingMs: number; closesAt: Date; expiring: boolean }
  | { kind: 'closed'; closedAt: Date; sinceMs: number };

export function windowState(lastInboundAt: Date | string | null | undefined, now: number = Date.now()): WindowState {
  if (!lastInboundAt) return { kind: 'unknown' };
  const last = new Date(lastInboundAt).getTime();
  if (Number.isNaN(last)) return { kind: 'unknown' };
  const closesAt = last + WINDOW_MS;
  const remainingMs = closesAt - now;
  if (remainingMs > 0) {
    return { kind: 'open', remainingMs, closesAt: new Date(closesAt), expiring: remainingMs <= WINDOW_WARNING_MS };
  }
  return { kind: 'closed', closedAt: new Date(closesAt), sinceMs: -remainingMs };
}

/** "5 h 12 min", "38 min", "3 días". */
export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  if (totalMin < 60) return `${Math.max(1, totalMin)} min`;
  const h = Math.floor(totalMin / 60);
  if (h < 48) {
    const m = totalMin % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  return `${Math.floor(h / 24)} días`;
}

/** Versión corta para la lista de chats: "5h", "38m", "3d". */
export function formatDurationShort(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  if (totalMin < 60) return `${Math.max(1, totalMin)}m`;
  const h = Math.floor(totalMin / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
