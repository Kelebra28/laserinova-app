/** Datos públicos de Laser Inova (etiquetas, firmas, mensajes). */
export const COMPANY = {
  name: "Laser Inova",
  website: "https://www.laserinova.com/",
  /** WhatsApp de atención a clientes (formato internacional, solo dígitos). */
  whatsappNumber: "525579398727",
  email: "info@laserinova.com",
} as const;

/**
 * Firma de los correos a clientes cuando el usuario no llenó la suya.
 * (Antes el teléfono por defecto era un número de ejemplo, +52 1 55 1234 5678.)
 */
export const DEFAULT_EMAIL_SIGNATURE = {
  name: "R.Basurto",
  title: "Director General",
  phone: "+52 55 7939 8727",
  email: COMPANY.email,
  web: "www.laserinova.com",
} as const;
