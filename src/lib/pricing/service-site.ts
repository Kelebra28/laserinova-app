import { SERVICE_SITE_DEFAULTS, type GlobalCosts } from "./config";

export interface ServiceSiteInput {
  serviceDays?: number;
  serviceHours?: number;
  operatorCost?: number;
  transportCost?: number;
  installCost?: number;
  laserUseCost?: number;
  consumablesCost?: number;
  viaticsCost?: number;
}

/**
 * Costo real de un servicio en sitio.
 * Operador, equipo láser y consumibles se prorratean por hora (costo del día ÷ 8 × horas);
 * transporte, instalación y viáticos se cobran completos por día. Mínimo un día.
 */
export function serviceSiteCost(input: ServiceSiteInput, globals: GlobalCosts): number {
  const d = SERVICE_SITE_DEFAULTS;
  const hours = input.serviceHours ?? d.horas_jornada;

  const operator = input.operatorCost ?? globals.costo_operador_sitio ?? d.costo_operador_sitio;
  const transport = input.transportCost ?? globals.costo_transporte_sitio ?? d.costo_transporte_sitio;
  const install = input.installCost ?? globals.costo_instalacion_sitio ?? d.costo_instalacion_sitio;
  const laser = input.laserUseCost ?? globals.costo_equipo_laser_sitio ?? d.costo_equipo_laser_sitio;
  const consumables = input.consumablesCost ?? globals.costo_consumibles_sitio ?? d.costo_consumibles_sitio;
  const viatics = input.viaticsCost ?? globals.costo_viaticos_sitio ?? d.costo_viaticos_sitio;

  const dailyOperator = (operator / d.horas_jornada) * hours;
  const dailyLaser = (laser / d.horas_jornada) * hours;
  const dailyConsumables = (consumables / d.horas_jornada) * hours;

  const costPerDay = dailyOperator + transport + install + dailyLaser + dailyConsumables + viatics;
  const days = (input.serviceDays || 0) > 0 ? (input.serviceDays as number) : 1;
  return costPerDay * days;
}

/** Precio del servicio en sitio: costo real + ganancia directa (sobreprecio, no margen sobre venta). */
export function serviceSitePrice(realCost: number, marginPct?: number): number {
  return realCost * (1 + (marginPct ?? SERVICE_SITE_DEFAULTS.margen_pct) / 100);
}
