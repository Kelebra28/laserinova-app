import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { calculateConcept, GlobalCosts } from "@/lib/calculations";
import { ChalanEstimateInput, ChalanContext, getChalanPrompt } from "./prompt";
import { getWorkshopRulesFromPinecone } from "./knowledge-base";

export interface ChalanExecutionResult {
  cleanEstimate: string;
  estimatedTimeMin: number | string;
  quotePayload: string;
  adminAlertMsg: string;
}

const money = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Mismos defaults que usa el CRM al cotizar (quote.service / página de nueva cotización). */
function buildGlobals(configs: { key: string; value: number }[]): GlobalCosts {
  const g: Record<string, number> = {};
  configs.forEach((c) => { g[c.key] = c.value; });
  return {
    costo_minuto_mayoreo: g["costo_minuto_mayoreo"] || 8.5,
    costo_minuto_menudeo: g["costo_minuto_menudeo"] || 10,
    porcentaje_iva: g["porcentaje_iva"] || 16,
    factor_guarda_default: g["factor_guarda_default"] || 1.2,
    margen_default: g["margen_default"] || 50,
    factor_produccion_default: g["factor_produccion_default"] || 3,
    precio_tubo: g["precio_tubo"] || 250000,
    vida_util_tubo: g["vida_util_tubo"] || 6000,
    factor_miedo: g["factor_miedo"] || 2,
    porcentaje_transporte_material: g["porcentaje_transporte_material"] || 20,
    porcentaje_merma_corte: g["porcentaje_merma_corte"] || 20,
  };
}

export async function executeChalanEstimate(
  input: ChalanEstimateInput,
  contact: { id: string; name?: string | null; phone: string },
  genAI: GoogleGenerativeAI
): Promise<ChalanExecutionResult> {
  // 1. Catálogo real de materiales, productos y configuración de costos
  let productListContext = "";
  let materialListContext = "";
  let materials: Awaited<ReturnType<typeof prisma.material.findMany>> = [];
  let globals: GlobalCosts = buildGlobals([]);

  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      select: { name: true, unitPrice: true },
    });
    if (products.length > 0) {
      productListContext = products.map((p) => `- ${p.name}: $${p.unitPrice} MXN`).join("\n");
    }

    materials = await prisma.material.findMany({ orderBy: { name: "asc" } });
    // El id del prompt es la posición en esta lista: así el modelo no puede inventar nombres.
    materialListContext = materials
      .map((m, i) => `${i} | ${m.name.trim()} | ${m.thickness ? `${m.thickness} mm` : "s/e"}`)
      .join("\n");

    const costConfigs = await prisma.costConfiguration.findMany({ where: { active: true } });
    globals = buildGlobals(costConfigs);
  } catch (err) {
    console.error("[El Chalán] Error obteniendo catálogos de base de datos:", err);
  }

  const context: ChalanContext = { productListContext, materialListContext };

  // 2. Reglas específicas de taller desde Pinecone para este material y proyecto
  const searchKeywords = `${input.project_name} ${input.material} ${input.grosor || ""}`;
  const workshopRules = await getWorkshopRulesFromPinecone(searchKeywords, genAI);

  // 3. Prompt: el modelo solo elige material y estima tiempo por pieza
  const prompt = getChalanPrompt(input, context, workshopRules);

  // 4. Invocar a Gemini
  let rawText = "";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent(prompt);
    rawText = result.response.text().trim();

    if (result.response.usageMetadata) {
      const inputTokens = result.response.usageMetadata.promptTokenCount || 0;
      const outputTokens = result.response.usageMetadata.candidatesTokenCount || 0;
      const estimatedCost = (inputTokens * 0.075) / 1000000 + (outputTokens * 0.3) / 1000000;

      await prisma.aiUsageLog.create({
        data: {
          agentName: "El Chalán",
          contactId: contact.id,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          estimatedCost,
        },
      });
    }
  } catch (error) {
    console.error("[El Chalán] Error al generar estimación con Gemini:", error);
  }

  // 5. Separar la nota técnica del JSON
  let note = rawText;
  let parsed: { materialId?: number | string | null; estimatedTimeMin?: number | string } = {};
  if (rawText.includes("||JSON||")) {
    const parts = rawText.split("||JSON||");
    note = parts[0].trim();
    try {
      if (parts[1]) parsed = JSON.parse(parts[1].trim().replace(/^```(?:json)?|```$/g, "").trim());
    } catch (e) {
      console.error("[El Chalán] Error parseando JSON técnico:", e);
    }
  }

  const timeNum = Number(parsed.estimatedTimeMin);
  const estimatedTimeMin: number | string = Number.isFinite(timeNum) && timeNum > 0 ? timeNum : "";

  const materialIdx = parsed.materialId === null || parsed.materialId === undefined || parsed.materialId === "" ? NaN : Number(parsed.materialId);
  const material = Number.isInteger(materialIdx) ? materials[materialIdx] : undefined;

  // 6. Costos con la fórmula del CRM (determinista), solo para corte/grabado
  const tipo = input.tipo_concepto === "REVENTA" ? "RESALE" : (input.tipo_concepto || "CORTE");
  const canCalculate = (tipo === "CORTE" || tipo === "GRABADO") && !!material && !!estimatedTimeMin
    && input.ancho_cm > 0 && input.alto_cm > 0 && input.cantidad > 0;

  const lines: string[] = [];
  if (note) lines.push(note);

  if (canCalculate && material) {
    const r = calculateConcept({
      type: tipo as "CORTE" | "GRABADO",
      quantity: input.cantidad,
      material: {
        length: material.length,
        width: material.width,
        sheetPrice: material.sheetPrice,
        guardPercentage: material.guardPercentage,
        pricePerCm2: material.pricePerCm2,
      },
      partWidth: input.ancho_cm,
      partHeight: input.alto_cm,
      timeMin: Number(estimatedTimeMin),
    }, globals);

    const sinPrecioMaterial = r.materialCost === 0;
    lines.push(
      "",
      `Material: ${material.name.trim()}`,
      `Área por pieza: ${(input.ancho_cm * input.alto_cm).toLocaleString("es-MX")} cm² x ${input.cantidad} pzas`,
      `Tiempo de máquina: ${estimatedTimeMin} min por pieza (${(Number(estimatedTimeMin) * input.cantidad).toLocaleString("es-MX")} min en total)`,
      `Costo de material (con transporte y merma): ${money(r.materialCost)}${sinPrecioMaterial ? " ⚠️ este material no tiene precio de lámina en el catálogo" : ""}`,
      `Costo de producción (máquina): ${money(r.productionCost)}`,
      `Costo real total: ${money(r.realCost)}`,
      `Precio de referencia menudeo (margen ${globals.margen_default}%, sin IVA): ${money(r.suggestedPrice)}`,
    );
  } else {
    lines.push(
      "",
      tipo !== "CORTE" && tipo !== "GRABADO"
        ? `Concepto tipo ${tipo}: no hay cálculo automático, hay que cotizarlo a mano.`
        : !material
          ? "No pude identificar el material en el catálogo: hay que elegirlo y cotizar a mano."
          : "No pude estimar el tiempo de máquina: hay que cotizar a mano.",
    );
    if (estimatedTimeMin) lines.push(`Tiempo de máquina estimado: ${estimatedTimeMin} min por pieza`);
  }

  const cleanEstimate = lines.join("\n").trim() || "No se pudo calcular el estimado.";

  // 7. Payload para el CRM (botón de creación de cotización).
  // Si el Chalán identificó el material, se manda su nombre exacto para que el formulario lo encuentre.
  const fullMaterialName = material ? material.name.trim() : (input.grosor ? `${input.material} ${input.grosor}` : input.material);
  const quoteData = {
    project: input.project_name,
    material: fullMaterialName,
    width: input.ancho_cm,
    height: input.alto_cm,
    qty: input.cantidad,
    estimatedTimeMin: estimatedTimeMin,
    name: input.nombre_cliente || "",
    email: input.correo_cliente || "",
    type: tipo,
    description: input.descripcion_concepto || "",
  };
  const quotePayload = `|||${encodeURIComponent(JSON.stringify(quoteData))}|||`;

  // 8. Alerta de WhatsApp para el administrador
  const adminAlertMsg = `🚨 *Nueva Solicitud de Cotización* 🚨
Cliente: ${contact.name || contact.phone} (${contact.phone})
Proyecto: ${input.project_name}
Material: ${input.material}
Grosor: ${input.grosor || "N/A"}
Ancho: ${input.ancho_cm} cm
Alto: ${input.alto_cm} cm
Cantidad: ${input.cantidad}
Diseño: ${input.diseno_incluido ? "Sí" : "No"}

🤖 *Estimación Previa del Chalán:*
${cleanEstimate}

_Para responder, busca este cliente en el CRM o comunícate con él directamente._`;

  return {
    cleanEstimate,
    estimatedTimeMin,
    quotePayload,
    adminAlertMsg,
  };
}
