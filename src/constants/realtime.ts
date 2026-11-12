/** Canal y eventos de Pusher. El servidor los emite (notification-emitter) y el navegador los escucha (useWhatsAppEvents). */
export const REALTIME_CHANNEL = "crm-channel";

export const REALTIME_EVENTS = {
  whatsappMessage: "whatsapp_message",
  whatsappStatusUpdate: "whatsapp_status_update",
  whatsappContactUpdate: "whatsapp_contact_update",
  whatsappReaction: "whatsapp_reaction",
} as const;

export type RealtimeEvent = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];
