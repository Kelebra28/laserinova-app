import { calculateConcept } from './src/lib/calculations';

const res = calculateConcept({
  type: "CORTE",
  quantity: 1,
  timeMin: 7,
  isWholesale: true,
  partWidth: 21,
  partHeight: 24,
  material: {
    sheetPrice: 1500, // example
    length: 120,
    width: 90,
  }
}, {
  costo_minuto_mayoreo: 8.5,
  costo_minuto_menudeo: 10,
  precio_tubo: 250000,
  vida_util_tubo: 6000,
  factor_miedo: 2,
  porcentaje_iva: 16,
  factor_guarda_default: 1.2,
  porcentaje_transporte_material: 20,
  porcentaje_merma_corte: 20,
  margen_default: 50,
  factor_produccion_default: 3
});

console.log(res);
