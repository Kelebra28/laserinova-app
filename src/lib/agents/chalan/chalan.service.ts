import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { ChalanEstimateInput, ChalanContext, getChalanPrompt } from "./prompt";
import { getWorkshopRulesFromPinecone } from "./knowledge-base";

export interface ChalanExecutionResult {
  cleanEstimate: string;
  estimatedTimeMin: number | string;
  quotePayload: string;
  adminAlertMsg: string;
}

export async function executeChalanEstimate(
  input: ChalanEstimateInput,
  contact: { id: string; name?: string | null; phone: string },
  genAI: GoogleGenerativeAI
): Promise<ChalanExecutionResult> {
  // 1. Obtener catálogo real de materiales, productos y costos de máquina
  let productListContext = "";
  let materialListContext = "";
  let machineCostMin = 0.70; // Fallback por defecto

  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      select: { name: true, unitPrice: true },
    });
    if (products.length > 0) {
      productListContext = products.map((p) => `- ${p.name}: $${p.unitPrice} MXN`).join("\n");
    }

    const materials = await prisma.material.findMany({
      select: { name: true, pricePerCm2: true, sheetPrice: true, length: true, width: true },
    });
    if (materials.length > 0) {
      materialListContext = materials
        .map((m) => {
          let costArea = m.pricePerCm2 || 0;
          if (!costArea && m.sheetPrice && m.length && m.width) {
            costArea = m.sheetPrice / (m.length * m.width);
          }
          // Añadirle el 20% de transporte y 20% de merma (factor 1.44)
          const costFinal = (costArea * 1.44).toFixed(4);
          return `- ${m.name}: $${costFinal} MXN por cm2 (ya incluye transporte y merma)`;
        })
        .join("\n");
    }

    const costConfigs = await prisma.costConfiguration.findMany();
    let tubePrice = 250000;
    let tubeLife = 6000;
    costConfigs.forEach((c) => {
      if (c.key === "precio_tubo") tubePrice = c.value;
      if (c.key === "vida_util_tubo") tubeLife = c.value;
    });
    machineCostMin = tubePrice / tubeLife / 60;
  } catch (err) {
    console.error("[El Chalán] Error obteniendo catálogos de base de datos:", err);
  }

  const context: ChalanContext = {
    productListContext,
    materialListContext,
    machineCostMin,
  };

  // 2. Consultar reglas específicas de taller desde Pinecone para este material y proyecto
  const searchKeywords = `${input.project_name} ${input.material} ${input.grosor || ""}`;
  const workshopRules = await getWorkshopRulesFromPinecone(searchKeywords, genAI);

  // 3. Generar prompt especializado
  const prompt = getChalanPrompt(input, context, workshopRules);

  // 4. Invocar a Gemini
  let rawText = "No se pudo calcular el estimado.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent(prompt);
    rawText = result.response.text().trim();

    // Registrar consumo de tokens de El Chalán
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

  // 5. Parsear el resultado (separar texto para el humano y JSON técnico)
  let cleanEstimate = rawText;
  let parsedChalanData: { estimatedTimeMin?: number | string } = {};

  if (rawText.includes("||JSON||")) {
    const parts = rawText.split("||JSON||");
    cleanEstimate = parts[0].trim();
    try {
      if (parts[1]) {
        parsedChalanData = JSON.parse(parts[1].trim());
      }
    } catch (e) {
      console.error("[El Chalán] Error parseando JSON técnico:", e);
    }
  }

  const estimatedTimeMin = parsedChalanData.estimatedTimeMin || "";

  // 6. Preparar payload para el CRM (botón de creación de cotización)
  const fullMaterialName = input.grosor ? `${input.material} ${input.grosor}` : input.material;
  const quoteData = {
    project: input.project_name,
    material: fullMaterialName,
    width: input.ancho_cm,
    height: input.alto_cm,
    qty: input.cantidad,
    estimatedTimeMin: estimatedTimeMin,
    name: input.nombre_cliente || "",
    email: input.correo_cliente || "",
  };
  const quotePayload = `|||${encodeURIComponent(JSON.stringify(quoteData))}|||`;

  // 7. Preparar mensaje de alerta de WhatsApp para el Administrador
  const adminAlertMsg = `🚨 *Nueva Solicitud de Cotización* 🚨
Cliente: ${contact.name || contact.phone} (${contact.phone})
Proyecto: ${input.project_name}
Material: ${input.material}
Grosor: ${input.grosor || "N/A"}
Ancho: ${input.ancho_cm} cm
Alto: ${input.alto_cm} cm
Cantidad: ${input.cantidad}
Diseño: ${input.diseno_incluido ? "Sí" : "No"}

🤖 *Estimación Previa del Chalán (IA):*
${cleanEstimate}

_Para responder, busca este cliente en el CRM o comunícate con él directamente._`;

  return {
    cleanEstimate,
    estimatedTimeMin,
    quotePayload,
    adminAlertMsg,
  };
}
