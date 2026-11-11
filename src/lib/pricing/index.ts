/**
 * Motor de precios del CRM. Todas las fórmulas de cotización viven en esta carpeta:
 *
 *   config.ts        valores por defecto y armado de los costos globales
 *   material.ts      costo de material (hoja, transporte, merma)
 *   laser.ts         costo de máquina y precio de corte/grabado (menudeo y mayoreo)
 *   service-site.ts  servicio en sitio
 *   product.ts       productos de catálogo con escalas por cantidad
 *   concept.ts       calculateConcept: aplica la fórmula que toca según el tipo de concepto
 *   totals.ts        subtotal, IVA, total y utilidad de la cotización
 *   server.ts        lectura de la configuración desde la base (solo servidor; se importa aparte)
 *
 * Este índice no toca la base de datos: se puede importar desde componentes de cliente.
 */
export * from "./config";
export * from "./material";
export * from "./laser";
export * from "./service-site";
export * from "./product";
export * from "./concept";
export * from "./totals";
