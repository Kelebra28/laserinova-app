import { calculateConcept } from './src/lib/calculations.ts';

const input = {
  type: "CORTE",
  quantity: 1,
  partWidth: 10,
  partHeight: 10,
  timeMin: 5,
  material: {
    length: 120,
    width: 180,
    sheetPrice: 1844,
    guardPercentage: 1.2,
    pricePerCm2: 0.102444
  }
};

const globals = {
  costo_minuto_mayoreo: 8.5,
  costo_minuto_menudeo: 10,
  precio_tubo: 250000,
  vida_util_tubo: 6000,
  factor_miedo: 2,
  porcentaje_iva: 16,
  factor_guarda_default: 1.5,
  porcentaje_transporte_material: 20,
  porcentaje_merma_corte: 20,
  margen_default: 50,
  factor_produccion_default: 3
};

const result = calculateConcept(input, globals);
console.log(result);
