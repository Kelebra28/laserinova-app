/** Helpers de teléfonos (México y WhatsApp). */

/** Solo los dígitos: "+52 (55) 1234-5678" → "525512345678". */
export function digitsOnly(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

/**
 * Últimos 10 dígitos, para comparar números de México sin importar el prefijo
 * (Meta entrega 521XXXXXXXXXX y la gente escribe 52XXXXXXXXXX o solo 10 dígitos).
 */
export function last10(phone: string | null | undefined): string {
  return digitsOnly(phone).slice(-10);
}

/** Link wa.me que abre un chat de WhatsApp; sin teléfono, deja elegir el contacto. */
export function waLink(phone?: string | null, text?: string): string {
  const number = digitsOnly(phone);
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${number}${query}`;
}
