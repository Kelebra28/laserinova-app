import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Consulta Pinecone para extraer reglas de taller, restricciones de máquinas o parámetros
 * de corte relacionados con el material o proyecto solicitado.
 */
export async function getWorkshopRulesFromPinecone(
  queryText: string,
  genAI?: GoogleGenerativeAI
): Promise<string> {
  if (!queryText || queryText.trim().length === 0) return "";

  if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX && genAI) {
    try {
      const { Pinecone } = await import("@pinecone-database/pinecone");
      const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      const index = pc.index(process.env.PINECONE_INDEX);

      // Convertir la búsqueda (material, proyecto, grosor) en embedding vectorial
      const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
      const result = await embeddingModel.embedContent(queryText);
      const vector = result.embedding.values;

      // Buscar en Pinecone (namespace 'chalan') las 3 reglas más relevantes
      const queryResponse = await index.namespace('chalan').query({
        vector: vector,
        topK: 3,
        includeMetadata: true,
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        const relevantChunks = queryResponse.matches
          .filter((match) => match.score && match.score > 0.55)
          .map((match) => match.metadata?.content as string)
          .filter(Boolean);

        if (relevantChunks.length > 0) {
          return relevantChunks.join("\n\n");
        }
      }
    } catch (error) {
      console.error("[El Chalán] Error consultando Pinecone:", error);
    }
  }

  return "";
}
