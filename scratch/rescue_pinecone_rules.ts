import { PrismaClient } from "@prisma/client";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const indexName = process.env.PINECONE_INDEX || "laser-inova-index"; 

async function classifyRule(text: string): Promise<{ namespace: string, title: string }> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
Eres un clasificador de reglas de negocio para un CRM. 
Analiza la siguiente regla y decide a qué namespace pertenece.
Opciones de namespace:
1. "sales_policies" (Si habla de anticipos, cotizaciones, mínimos de compra, entregas, o dinero).
2. "material_rules" (Si habla de especificaciones técnicas, cómo cortar acrílico, MDF, grosores permitidos, prohibiciones de PVC, etc.).
3. "product_protocols" (Si habla de cómo vender un producto en específico, por ejemplo "plumas", "termos", "libretas", sugerir catálogo, etc.).
Si no encaja en ninguna, usa "general_rules".

Regla a clasificar:
"${text}"

Devuelve ÚNICAMENTE un JSON válido con esta estructura estricta, sin markdown ni comillas invertidas:
{"namespace": "el_namespace_elegido", "title": "Un título corto y descriptivo de 3 a 5 palabras"}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim().replace(/```json/g, "").replace(/```/g, "");
    const parsed = JSON.parse(responseText);
    return parsed;
  } catch (error) {
    console.error("Error clasificando regla:", error);
    return { namespace: "general_rules", title: "Regla sin clasificar" };
  }
}

async function runRescue() {
  try {
    console.log("🚀 Iniciando el rescate de las 181 reglas desde Pinecone...");
    const index = pc.Index(indexName);
    const namespace = index.namespace("secretary");

    // Obtener los IDs de los vectores usando listPaginated
    console.log("📥 Obteniendo lista de vectores del namespace 'secretary'...");
    let vectorIds: string[] = [];
    let paginationToken: string | undefined = undefined;

    do {
      const listResponse = await namespace.listPaginated({ limit: 100, paginationToken });
      if (listResponse.vectors) {
        vectorIds.push(...listResponse.vectors.map(v => v.id));
      }
      paginationToken = listResponse.pagination?.next;
    } while (paginationToken);

    console.log(`✅ Se encontraron ${vectorIds.length} vectores. Procediendo a descargar metadatos...`);

    if (vectorIds.length === 0) {
      console.log("⚠️ No hay vectores en el namespace 'secretary'. Saliendo.");
      return;
    }

    // Dividimos en lotes de 100 para fetch
    const BATCH_SIZE = 100;
    let rescuedCount = 0;

    for (let i = 0; i < vectorIds.length; i += BATCH_SIZE) {
      const batchIds = vectorIds.slice(i, i + BATCH_SIZE).filter(id => id && id.trim().length > 0);
      
      if (batchIds.length === 0) continue;

      const fetchResult = await index.fetch({ ids: batchIds, namespace: "secretary" });
      
      const records = Object.values(fetchResult.records || {});
      
      for (const record of records) {
        // Asumimos que el texto original está en record.metadata.text o record.metadata.content
        const originalText = record.metadata?.text || record.metadata?.content;
        
        if (!originalText || typeof originalText !== "string") {
          console.warn(`⚠️ El vector ${record.id} no tiene texto en su metadata. Saltando...`);
          continue;
        }

        console.log(`\n🤖 Clasificando vector ${record.id}...`);
        const classification = await classifyRule(originalText);
        console.log(`   -> Asignado a: ${classification.namespace} | Título: ${classification.title}`);

        // Insertar en Prisma
        await prisma.agentRule.create({
          data: {
            id: record.id, // Conservar el mismo ID si es posible (uuid válido)
            namespace: classification.namespace,
            title: classification.title,
            content: originalText,
            isVectorized: true, // Ya está en Pinecone, aunque esté en el namespace viejo por ahora
            active: true
          }
        });
        rescuedCount++;
      }
    }

    console.log(`\n🎉 ¡RESCATE COMPLETADO! Se rescataron y guardaron ${rescuedCount} reglas en tu base de datos MySQL.`);
    console.log("➡️ Siguiente paso: Crear la interfaz visual para que las puedas ver y editar.");

  } catch (error) {
    console.error("❌ Error en el proceso de rescate:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runRescue();
