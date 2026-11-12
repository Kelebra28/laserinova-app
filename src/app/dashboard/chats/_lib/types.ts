/**
 * Formas que maneja la pantalla de chats. Llegan de tres lados: el render del servidor
 * (fechas como Date), las server actions y los eventos de Pusher (fechas como texto ISO).
 */

export type ChatMessage = {
  id: string;
  messageId?: string | null;
  contactId: string;
  /** INBOUND (del cliente), OUTBOUND (del CRM o el bot) o INTERNAL (nota del sistema). */
  direction: string;
  /** TEXT, IMAGE, AUDIO, DOCUMENT, VIDEO, REACTION… */
  type: string;
  content: string | null;
  status?: string | null;
  timestamp: string | Date;
  /** URL http, 'FETCH_REQUIRED' (se pide a /api/media/<id>) o null. */
  mediaUrl?: string | null;
  mimeType?: string | null;
  reaction?: string | null;
  aiTrace?: string | null;
};

export type ChatContact = {
  id: string;
  name: string | null;
  phone: string;
  botMode: boolean;
  profilePictureUrl?: string | null;
  /** Número de un administrador (bot de gestión), no un cliente. */
  isAdmin?: boolean;
  /** Último mensaje del cliente: abre la ventana de 24 h de WhatsApp. */
  lastInboundAt?: string | Date | null;
  /** Solo el último mensaje, para la vista previa de la lista. */
  messages?: ChatMessage[];
};

export type ListFilter = 'all' | 'unread' | 'bot' | 'human' | 'admin';

/** Contacto de prueba del simulador (no se le manda nada real por WhatsApp). */
export { isSimulatorContact } from '@/constants/whatsapp';
