/**
 * Almacenes de Doble Vela que componen el inventario central de Ciudad de México (CDMX).
 * Documentación oficial de Doble Vela Web Service, Pág. 8:
 * - "Disponible Almacén 7"
 * - "Disponible Almacén 9"
 * - "Disponible Almacén 15"
 * - "Disponible Almacén 20"
 * - "Disponible Almacén 24"
 */

export const CDMX_WAREHOUSES = [7, 9, 15, 20, 24] as const;

export type CDMXWarehouseId = typeof CDMX_WAREHOUSES[number];

export const CDMX_WAREHOUSE_KEYS = [
  "Disponible Almacen 7",
  "Disponible Almacen 9",
  "Disponible Almacen 15",
  "Disponible Almacen 20",
  "Disponible Almacen 24",
  "Disponible Almacén 7",
  "Disponible Almacén 9",
  "Disponible Almacén 15",
  "Disponible Almacén 20",
  "Disponible Almacén 24",
] as const;
