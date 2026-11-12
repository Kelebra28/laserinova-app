/** URLs externas y del propio CRM. Cambiar una versión o dominio aquí lo cambia en todo el sistema. */

/** Dominio de producción, por si faltan NEXT_PUBLIC_APP_URL y NEXTAUTH_URL. */
export const APP_URL_FALLBACK = "https://app.laserinova.com";

/** URL base del CRM sin "/" final (para links en WhatsApp, correos y notificaciones). Solo servidor. */
export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || APP_URL_FALLBACK).replace(/\/$/, "");
}

/** API de WhatsApp Cloud (Meta). Subir de versión = cambiar solo esta línea. */
export const META_GRAPH_API_VERSION = "v19.0";
export const META_GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

/** Imágenes del proveedor Doble Vela. */
export const DOBLEVELA_IMAGE_BASE = "https://doblevela.com/images/large/";

/** "045 - Azul Marino" → "azulmarino" (como nombra Doble Vela sus fotos por color). */
export function doblevelaColorSlug(color: string): string {
  return color.replace(/^\d+\s*-\s*/, "").replace(/\s+/g, "").toLowerCase();
}

/** Foto de un modelo de Doble Vela; con `colorSlug`, la del color específico. */
export function doblevelaImageUrl(model: string, colorSlug?: string): string {
  return colorSlug ? `${DOBLEVELA_IMAGE_BASE}${model}_${colorSlug}_lrg.jpg` : `${DOBLEVELA_IMAGE_BASE}${model}_lrg.jpg`;
}

/** Generador de códigos QR (etiquetas). */
export function qrCodeUrl(data: string, size = 150): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&margin=0`;
}

/** Link para dejar reseña en Google Maps. Vacío = el botón de la encuesta no se muestra. */
export const GOOGLE_REVIEW_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || "";

/** Imagen local cuando la foto de un producto no carga (antes dependía de via.placeholder.com). */
export const PRODUCT_IMAGE_PLACEHOLDER = "/placeholder-product.svg";
