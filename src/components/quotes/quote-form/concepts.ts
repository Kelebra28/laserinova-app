/**
 * Lógica pura de las partidas (conceptos) de una cotización, compartida por NewQuoteForm y EditQuoteForm.
 * Antes la fórmula de cada partida estaba copiada 4 veces (2 por formulario). Sin React ni estado:
 * recibe una partida y devuelve la partida nueva.
 */
import {
  calculateConcept, calculateQuoteTotals, ivaPct, FORMULA_CONCEPT_TYPES, resolveProductUnitPrice, maxCostOfModel,
  type CalculationInput, type GlobalCosts,
} from "@/lib/pricing";

/* eslint-disable @typescript-eslint/no-explicit-any -- las partidas, materiales y productos aún no tienen tipo propio */
export type QuoteConcept = Record<string, any>;

export type ConceptType = "CORTE" | "GRABADO" | "IMPRESION" | "PRODUCTO" | "OTRO" | "RESALE" | "SERVICIO_SITIO";

/** Lo que necesita la fórmula además de la partida. */
export type ConceptContext = {
  materials: any[];
  products: any[];
  globalCosts: GlobalCosts;
  /** Margen general de la cotización (%). */
  margin: number | string;
  isWholesale: boolean;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Campos que, al cambiar, vuelven a correr la fórmula. */
const RECALC_FIELDS = [
  "type", "quantity", "materialId", "partWidth", "partHeight", "timeMin", "clientProvidesMaterial",
  "manualUnitPrice", "manualUnitCost", "serviceDays", "serviceHours", "operatorCost", "transportCost",
  "installCost", "laserUseCost", "consumablesCost", "viaticsCost", "margin",
];

/** Parámetros de la fórmula: al cambiarlos se borra el precio manual para que gane el calculado. */
const RESET_MANUAL_FIELDS = [
  "materialId", "partWidth", "partHeight", "timeMin", "clientProvidesMaterial", "serviceDays", "serviceHours",
  "transportCost", "operatorCost", "installCost", "laserUseCost", "consumablesCost", "viaticsCost",
];

/** Campo opcional: vacío o sin definir = que la fórmula use su default. */
const optionalNumber = (v: unknown) => (v !== undefined && v !== "" ? Number(v) : undefined);

/** Entrada de calculateConcept a partir de una partida del formulario. */
export function conceptCalcInput(c: QuoteConcept, ctx: ConceptContext): CalculationInput {
  const mat = ctx.materials.find(m => m.id === c.materialId);
  return {
    type: c.type,
    quantity: Number(c.quantity),
    material: mat ? {
      length: mat.length,
      width: mat.width,
      sheetPrice: mat.sheetPrice,
      guardPercentage: mat.guardPercentage,
      pricePerCm2: mat.pricePerCm2,
    } : undefined,
    partWidth: Number(c.partWidth),
    partHeight: Number(c.partHeight),
    timeMin: Number(c.timeMin),
    clientProvidesMaterial: c.clientProvidesMaterial,
    isWholesale: ctx.isWholesale,
    manualUnitPrice: Number(c.manualUnitPrice) || 0,
    manualCost: Number(c.manualUnitCost) || 0,
    serviceDays: Number(c.serviceDays) || 0,
    serviceHours: Number(c.serviceHours) || 0,
    operatorCost: optionalNumber(c.operatorCost),
    transportCost: optionalNumber(c.transportCost),
    installCost: optionalNumber(c.installCost),
    laserUseCost: optionalNumber(c.laserUseCost),
    consumablesCost: optionalNumber(c.consumablesCost),
    viaticsCost: optionalNumber(c.viaticsCost),
    margin: optionalNumber(c.margin),
  };
}

/**
 * Corre la fórmula y fija precio y total.
 * `useSuggested`: true = el precio unitario pasa a ser el sugerido; false = se respeta el que ya tenía (si es > 0).
 */
function priceConcept(c: QuoteConcept, ctx: ConceptContext, useSuggested: boolean): QuoteConcept {
  const result = calculateConcept(conceptCalcInput(c, ctx), { ...ctx.globalCosts, margen_default: Number(ctx.margin) || 35 });
  const suggestedUnit = result.suggestedPrice / (Number(c.quantity) || 1);
  const finalUnit = (useSuggested || !c.finalUnitPrice || Number(c.finalUnitPrice) <= 0) ? suggestedUnit : c.finalUnitPrice;
  const totalAmount = (Number(finalUnit) || 0) * (Number(c.quantity) || 1);
  return { ...c, calculated: { ...result, utility: totalAmount - result.realCost }, finalUnitPrice: finalUnit, totalAmount };
}

/** Cambia un campo de la partida y recalcula lo que haga falta. */
export function updateConceptField(c: QuoteConcept, field: string, value: unknown, ctx: ConceptContext): QuoteConcept {
  const updated: QuoteConcept = { ...c, [field]: value };

  // Productos de catálogo: al cambiar la cantidad se re-aplica la escala de margen
  // (solo si el precio no fue editado a mano).
  if (field === "quantity" && updated.productId) {
    const prod = ctx.products.find(p => p.id === updated.productId);
    if (prod) {
      const prev = resolveProductUnitPrice(prod, Number(c.quantity) || 1, ctx.globalCosts, maxCostOfModel(prod, ctx.products));
      const next = resolveProductUnitPrice(prod, Number(value) || 1, ctx.globalCosts, maxCostOfModel(prod, ctx.products));
      if (next.tiered && Math.abs((Number(c.finalUnitPrice) || 0) - prev.unitPrice) < 0.01) {
        updated.manualUnitPrice = String(next.unitPrice);
        updated.manualUnitCost = String(next.unitCost);
        updated.finalUnitPrice = next.unitPrice;
      }
    }
  }

  if (RESET_MANUAL_FIELDS.includes(field)) {
    updated.manualUnitPrice = "";
    updated.manualUnitCost = "";
  }

  if (RECALC_FIELDS.includes(field)) {
    // Si cambian parámetros de la fórmula (que no sean cantidad), el precio final pasa al sugerido.
    return priceConcept(updated, ctx, field !== "quantity");
  }

  // Precio final editado a mano
  if (field === "finalUnitPrice") {
    const finalPrice = Number(parseFloat(String(value))) || 0;
    const totalAmount = finalPrice * Number(updated.quantity || 0);
    const utility = totalAmount - (Number(updated.calculated?.realCost) || 0);
    return { ...updated, finalUnitPrice: finalPrice, totalAmount, calculated: { ...updated.calculated, finalUnitPrice: finalPrice, totalAmount, utility } };
  }

  return updated;
}

/** Al cambiar margen general, mayoreo, costos o materiales: las partidas de fórmula toman el nuevo precio sugerido. */
export function repriceConcept(c: QuoteConcept, ctx: ConceptContext): QuoteConcept {
  return priceConcept(c, ctx, FORMULA_CONCEPT_TYPES.includes(c.type));
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- producto de catálogo */
export function conceptWithProduct(c: QuoteConcept, product: any, ctx: ConceptContext): QuoteConcept {
  const qty = Number(c.quantity) || 1;
  // Precio por escalas de cantidad (o precio manual del producto si lo tiene)
  const resolved = resolveProductUnitPrice(product, qty, ctx.globalCosts, maxCostOfModel(product, ctx.products));
  const unitCost = resolved.unitCost;
  const suggestedSalePrice = resolved.unitPrice;
  const finalUnitPrice = suggestedSalePrice;
  const totalAmount = finalUnitPrice * qty;
  const realCost = unitCost * qty;
  const suggestedPrice = suggestedSalePrice * qty;
  const cleanDesc = product.model ? product.name.split(product.model)[0].trim() : product.name;

  return {
    ...c,
    productId: product.id,
    productImage: product.image || null,
    description: cleanDesc,
    manualUnitPrice: suggestedSalePrice,
    manualUnitCost: unitCost,
    finalUnitPrice,
    totalAmount,
    calculated: {
      materialBaseCost: realCost,
      materialWastageCost: 0,
      materialCost: realCost,
      productionCost: 0,
      realCost,
      suggestedPrice,
      finalUnitPrice,
      totalAmount,
      utility: totalAmount - realCost,
    },
  };
}

export function conceptWithoutProduct(c: QuoteConcept): QuoteConcept {
  return {
    ...c,
    productId: null,
    productImage: null,
    manualUnitPrice: "",
    manualUnitCost: "",
    finalUnitPrice: 0,
    totalAmount: 0,
    calculated: null,
  };
}

/** Partida vacía de la cotización nueva (campos de texto vacíos para que el input muestre el placeholder). */
export function emptyConcept(type: ConceptType): QuoteConcept {
  return {
    id: crypto.randomUUID(),
    type,
    description: "",
    quantity: 1,
    materialId: "",
    productId: null,
    productImage: null,
    clientProvidesMaterial: false,
    partWidth: "",
    partHeight: "",
    timeMin: "",
    manualUnitPrice: "",
    manualUnitCost: "",
    // Resultados calculados
    materialCost: 0,
    productionCost: 0,
    realCost: 0,
    suggestedPrice: 0,
    totalAmount: 0,
    details: "",
    serviceDays: "",
    serviceHours: "",
    operatorCost: "",
    transportCost: "",
    installCost: "",
    laserUseCost: "",
    consumablesCost: "",
    viaticsCost: "",
    margin: "",
  };
}

/** Subtotal, IVA, total, costo real y utilidad (respeta el switch de IVA). */
export function conceptsTotals(concepts: QuoteConcept[], { taxable, globalCosts }: { taxable: boolean; globalCosts: GlobalCosts }) {
  const conceptsTotal = concepts.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0);
  const realCost = concepts.reduce((sum, c) => sum + (Number(c.calculated?.realCost) || 0), 0);
  return calculateQuoteTotals(conceptsTotal, realCost, { taxable, ivaPct: ivaPct(globalCosts) });
}
