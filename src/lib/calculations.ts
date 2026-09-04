// Tipos de cálculo soportados
export type CalculationType = "CORTE" | "GRABADO" | "IMPRESION" | "PRODUCTO" | "OTRO" | "RESALE" | "SERVICIO_SITIO";

export interface GlobalCosts {
  costo_minuto_mayoreo: number;
  costo_minuto_menudeo: number;
  precio_tubo: number;
  vida_util_tubo: number;
  factor_miedo: number;
  porcentaje_iva: number;
  factor_guarda_default: number; // legacy fallback
  porcentaje_transporte_material: number;
  porcentaje_merma_corte: number;
  margen_default: number;
  factor_produccion_default: number;
  [key: string]: number;
}

export interface MaterialData {
  length?: number | null;
  width?: number | null;
  sheetPrice?: number | null;
  guardPercentage?: number | null;
  pricePerCm2?: number | null;
}

export interface CalculationInput {
  type: CalculationType;
  quantity: number;
  
  // Para CORTE, GRABADO
  material?: MaterialData;
  clientProvidesMaterial?: boolean;
  partWidth?: number;
  partHeight?: number;
  timeMin?: number;
  isWholesale?: boolean; // Mayoreo o menudeo
  
  // Para IMPRESION, PRODUCTO, OTRO, RESALE
  // Para IMPRESION, PRODUCTO, OTRO, RESALE
  manualUnitPrice?: number;
  manualCost?: number;
  
  // Para SERVICIO_SITIO
  serviceDays?: number;
  serviceHours?: number;
  operatorCost?: number;
  transportCost?: number;
  installCost?: number;
  laserUseCost?: number;
  consumablesCost?: number;
  viaticsCost?: number;
  margin?: number;
}

export interface CalculationResult {
  materialBaseCost: number; // Costo sin merma
  materialWastageCost: number; // Solo el 50% de merma
  materialCost: number; // Total material (base + merma)
  productionCost: number; // Costo de máquina
  realCost: number; // Total (materialCost + productionCost)
  suggestedPrice: number;
}


export function calculateConcept(input: CalculationInput, globals: GlobalCosts): CalculationResult {
  let materialBaseCost = 0;
  let materialWastageCost = 0;
  let materialCost = 0;
  let productionCost = 0;
  let realCost = 0;
  let suggestedPrice = 0;

  // Parámetros para la nueva fórmula de máquina
  const tubePrice = globals.precio_tubo || 250000;
  const tubeLifeHours = globals.vida_util_tubo || 6000;
  const fearFactor = globals.factor_miedo || 2;
  const prodFactor = globals.factor_produccion_default || 3;

  // 1. Calcular costo de material si aplica (CORTE o GRABADO)
  if ((input.type === "CORTE" || input.type === "GRABADO") && input.material && input.partWidth && input.partHeight) {
    if (!input.clientProvidesMaterial) {
      const transportFactor = 1 + ((globals.porcentaje_transporte_material ?? 20) / 100);
      const mermaPercent = (globals.porcentaje_merma_corte ?? 20) / 100;
      
      let purePriceCm2 = 0;

      // Si tenemos los datos de la hoja completa (lo más exacto)
      if (input.material.sheetPrice && input.material.length && input.material.width) {
        // La hoja YA incluye IVA en el inventario según el usuario, solo aplicamos Transporte
        const sheetWithTransport = input.material.sheetPrice * transportFactor;
        
        const areaHoja = input.material.length * input.material.width;
        purePriceCm2 = sheetWithTransport / areaHoja;
      } 
      // Fallback para materiales viejos que solo tenían pricePerCm2 (legacy)
      else if (input.material.pricePerCm2) {
        const oldGuardFactor = input.material.guardPercentage || globals.factor_guarda_default || 1.2;
        // Extraemos el base original sin Guarda. (Asumimos que ya trae IVA como es su nuevo estándar)
        const baseSinNada = input.material.pricePerCm2 / oldGuardFactor;
        // Ahora lo convertimos al nuevo modelo (solo aplicando transporte)
        purePriceCm2 = baseSinNada * transportFactor;
      }
      
      if (purePriceCm2 > 0) {
        const areaPieza = input.partWidth * input.partHeight;
        
        // El materialBaseCost es el costo de la pieza YA INCLUYENDO Iva y Transporte
        materialBaseCost = areaPieza * purePriceCm2;
        
        // Y a esa pieza le sumamos su propia Merma de corte
        materialWastageCost = materialBaseCost * mermaPercent; 
        
        materialCost = materialBaseCost + materialWastageCost;
      }
    }
  }

  // 2. Calcular según el tipo
  switch (input.type) {
    case "CORTE":
    case "GRABADO":
      const totalTime = input.timeMin || 0;

      // --- NUEVA FÓRMULA DE MÁQUINA ---
      // 1. Costo base por minuto (vida del tubo)
      // (Precio Tubo / Horas Vida) / 60 min
      const baseMinCost = (tubePrice / tubeLifeHours) / 60;
      
      // 2. Costo puro del corte para esta pieza
      const pureCutCost = totalTime * baseMinCost;
      
      // 3. Aplicar Factor de Miedo (duplicar) y Factor de Producción (triplicar)
      productionCost = pureCutCost * fearFactor * prodFactor;
      
      // Costo Real = Costo Material + Costo Producción (Operación)
      // Si se proporciona un costo manual, se usa ese (para casos "especiales")
      realCost = input.manualCost || (materialCost + productionCost); 
      
      if (input.isWholesale) {
        // Cálculo por Mayoreo: Costo de Material + (Tiempo * Costo Minuto Mayoreo)
        const mayoreoPrice = materialCost + (totalTime * (globals.costo_minuto_mayoreo || 8.5));
        suggestedPrice = input.manualUnitPrice || mayoreoPrice;
      } else {
        // Cálculo Normal: Precio Sugerido = Costo Total / (1 - Margen)
        let marginDefault = globals.margen_default || 50;
        if (marginDefault >= 100) marginDefault = 99; // Prevención de división por cero
        const marginFactor = (100 - marginDefault) / 100;
        suggestedPrice = input.manualUnitPrice || (realCost / marginFactor);
      }
      break;

    case "RESALE":
    case "IMPRESION":
    case "PRODUCTO":
    case "OTRO":
      realCost = input.manualCost || 0;
      suggestedPrice = input.manualUnitPrice || 0;
      break;

    case "SERVICIO_SITIO":
      const days = input.serviceDays || 0;
      const hours = input.serviceHours ?? 8;
      
      const opCost = input.operatorCost ?? globals.costo_operador_sitio ?? 1500;
      const transCost = input.transportCost ?? globals.costo_transporte_sitio ?? 1500;
      const instCost = input.installCost ?? globals.costo_instalacion_sitio ?? 1000;
      const laserCost = input.laserUseCost ?? globals.costo_equipo_laser_sitio ?? 3500;
      const consCost = input.consumablesCost ?? globals.costo_consumibles_sitio ?? 1000;
      const viatCost = input.viaticsCost ?? globals.costo_viaticos_sitio ?? 1300;
      
      const hourlyRateOp = opCost / 8;
      const hourlyRateLaser = laserCost / 8;
      const hourlyRateConsumables = consCost / 8;
      
      const dailyOp = hourlyRateOp * hours;
      const dailyLaser = hourlyRateLaser * hours;
      const dailyCons = hourlyRateConsumables * hours;
      
      const totalCostPerDay = dailyOp + transCost + instCost + dailyLaser + dailyCons + viatCost;
      const effectiveDays = days > 0 ? days : 1;
      const totalServiceCost = totalCostPerDay * effectiveDays;
      
      // Costo Real = Total de Operación por Día * Días
      // Si se proporciona un costo manual, se usa ese
      realCost = input.manualCost || totalServiceCost;
      
      const customMargin = input.margin ?? 30; // 30% default
      // Ganancia directa (Markup)
      const markupFactor = 1 + (customMargin / 100);
      suggestedPrice = input.manualUnitPrice || (realCost * markupFactor);
      break;

  }


  // Multiplicar por cantidad
  return {
    materialBaseCost: Number((materialBaseCost * input.quantity).toFixed(2)),
    materialWastageCost: Number((materialWastageCost * input.quantity).toFixed(2)),
    materialCost: Number((materialCost * input.quantity).toFixed(2)),
    productionCost: Number((productionCost * input.quantity).toFixed(2)),
    realCost: Number((realCost * input.quantity).toFixed(2)),
    suggestedPrice: Number((suggestedPrice * input.quantity).toFixed(2)),
  };
}


