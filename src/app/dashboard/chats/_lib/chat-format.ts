/** Helpers puros de formato para la pantalla de chats (sin estado ni efectos). */
import type { ChatMessage } from './types';

export { cn } from '@/lib/cn';

/** Hora en la lista de chats: "14:05" hoy, "Ayer", o "09/11/26". */
export function listTime(d: Date) {
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Separador de día en la conversación: "Hoy", "Ayer", "lunes, 9 de noviembre". */
export function dayLabel(d: Date) {
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Hoy';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}) });
}

/** Texto de vista previa del último mensaje en la lista. */
export function previewOf(m: Pick<ChatMessage, 'direction' | 'type' | 'content'> | null | undefined): string {
  if (!m) return 'Sin mensajes recientes';
  if (m.direction === 'INTERNAL') return '📝 Nota interna';
  switch (m.type) {
    case 'IMAGE': return m.content === '🎭 Sticker' ? '🎭 Sticker' : '📷 Foto';
    case 'AUDIO': return '🎤 Audio';
    case 'DOCUMENT': return '📄 Documento';
    default: return (m.content || '').replace(/\s*\n\s*/g, ' ');
  }
}

/** Contador de la grabadora: "0:07", "1:23". */
export function formatRecordingTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** Reacciones rápidas del menú de cada burbuja. */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
