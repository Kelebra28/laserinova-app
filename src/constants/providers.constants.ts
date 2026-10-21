/**
 * Proveedores oficiales de catálogo integrados en el CRM Laser Inova.
 */
export const PRODUCT_PROVIDERS = ["Doble Vela", "Promoopcion", "Impressline"] as const;

export type ProductProvider = typeof PRODUCT_PROVIDERS[number];

export const DEFAULT_PRODUCT_PROVIDER: ProductProvider = "Doble Vela";
