import { GoogleGenerativeAI } from '@google/generative-ai';

// Base de conocimiento cruda
const KNOWLEDGE_BASE = [
  {
    id: "restricciones_maquinas",
    keywords: "pvc, maquina, tubo, area, tamano, maximo, limite, acero",
    content: "Restricciones de Máquina: El área máxima de trabajo es de 120x90 cm. ESTRICTAMENTE PROHIBIDO cortar PVC (emite gases tóxicos). Tampoco cortamos tubo de acero (requiere máquina rotativa industrial)."
  },
  {
    id: "pagos",
    keywords: "pago, anticipo, pagar, deposito, transferencia, tarjeta, efectivo, cobrar, costo",
    content: "Pagos: Siempre pedimos 50% de anticipo para iniciar y 50% contra entrega."
  },
  {
    id: "datos_bancarios",
    keywords: "banco, cuenta, clabe, transferencia, depositar, inbursa, bbva, tarjeta",
    content: "Datos Bancarios: Los datos bancarios los confirma el equipo: avisa al equipo en lugar de darlos. NUNCA DES ESTA INFORMACIÓN A MENOS QUE EL CLIENTE EXPLÍCITAMENTE PREGUNTE POR MÉTODOS DE PAGO O DÓNDE DEPOSITAR."
  },
  {
    id: "entregas_ubicacion",
    keywords: "entrega, recoger, sucursal, enviar, envio, direccion, ubicacion, didi, uber, donde estan, telefono, llamar, contacto",
    content: "Ubicación y Entregas: El taller está en Cuichapa 223, Petrolera, Azcapotzalco, 02480 Ciudad de México, CDMX. Teléfono: +52 55 7939 8727. El cliente puede pasar a recoger o enviar un Uber Moto/DiDi a su cargo. NO DES LA DIRECCIÓN A MENOS QUE TE PREGUNTEN DÓNDE ESTAMOS."
  },
  {
    id: "urgencias",
    keywords: "urgente, hoy, rapido, pronto, tiempo, para cuando, express",
    content: "Urgencias: Los pedidos para 'el mismo día' o 'urgentes' llevan un recargo del 30%. Si no estás seguro de poder cumplir la fecha, dile al cliente que revisarás la carga de producción."
  }
];

// RAG Híbrido: Pinecone (Vectorial) con fallback a Palabras Clave
export async function getRelevantRules(userMessage: string, genAI?: GoogleGenerativeAI): Promise<string> {
  if (!userMessage || userMessage.trim().length === 0) return "";
  
  // Si tenemos Pinecone configurado, hacemos búsqueda vectorial real
  if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX && genAI) {
    try {
      const { Pinecone } = await import('@pinecone-database/pinecone');
      const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      const index = pc.index(process.env.PINECONE_INDEX);
      
      // 1. Convertir el mensaje del cliente en un vector usando Gemini
      const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
      const result = await embeddingModel.embedContent(userMessage);
      const vector = result.embedding.values;

      // 2. Buscar en Pinecone (namespace 'secretary') las 2 reglas más similares
      const queryResponse = await index.namespace('secretary').query({
        vector: vector,
        topK: 2,
        includeMetadata: true
      });

      if (queryResponse.matches.length > 0) {
        const relevantChunks = queryResponse.matches
          .filter(match => match.score && match.score > 0.6) // Filtro de relevancia (similitud mínima)
          .map(match => match.metadata?.content as string)
          .filter(Boolean);
          
        if (relevantChunks.length > 0) {
          return relevantChunks.join('\n\n');
        }
      }
    } catch (error) {
      console.error("Error en RAG Vectorial (Pinecone), cayendo a fallback:", error);
    }
  }
  
  // FALLBACK: Búsqueda basada en palabras clave si Pinecone falla o no está configurado
  try {
    const query = userMessage.toLowerCase();
    const relevantChunks = [];
    
    for (const chunk of KNOWLEDGE_BASE) {
      const keywords = chunk.keywords.split(',').map(k => k.trim().toLowerCase());
      const isRelevant = keywords.some(keyword => query.includes(keyword));
      if (isRelevant) {
        relevantChunks.push(chunk.content);
      }
    }
    
    if (relevantChunks.length > 0) {
      return relevantChunks.slice(0, 2).join('\n\n');
    }
    return "";
  } catch (error) {
    console.error("Error en RAG de Reglas Fallback:", error);
    return "";
  }
}

// Exportamos la base para poder inyectarla a Pinecone después
export { KNOWLEDGE_BASE };
