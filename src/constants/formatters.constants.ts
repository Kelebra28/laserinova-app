/**
 * Los formatos viven en src/lib/format.ts (son funciones, no constantes).
 * Se re-exportan aquí para no romper los imports existentes de "@/constants" y "@/lib/constants".
 */
export { formatNumber, formatCurrency } from "@/lib/format";
