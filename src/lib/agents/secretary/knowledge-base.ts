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
export interface RagResult {
  context: string;
  // Etiquetas legibles de cada regla inyectada (para mostrarlas en el chat del CRM)
  sources: string[];
}

export async function getRelevantRules(userMessage: string, genAI?: GoogleGenerativeAI): Promise<RagResult> {
  const empty: RagResult = { context: "", sources: [] };
  if (!userMessage || userMessage.trim().length === 0) return empty;
  
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

      // 2. Buscar en Pinecone (Búsqueda Ruteada Paralela Multi-Namespace)
      const namespacesToQuery = ["sales_policies", "material_rules", "product_protocols", "general_rules"];
      
      const queryPromises = namespacesToQuery.map(ns => 
        index.namespace(ns).query({
          vector: vector,
          topK: 2,
          includeMetadata: true
        })
      );

      const responses = await Promise.all(queryPromises);
      
      // Juntar todos los matches, ordenarlos por puntaje de relevancia y tomar los mejores 4
      const allMatches = responses
        .flatMap(res => res.matches)
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 4);

      if (allMatches.length > 0) {
        const relevant = allMatches.filter(match => match.score && match.score > 0.6 && match.metadata?.content); // Filtro de relevancia
        const relevantChunks = relevant.map(match => `[${match.metadata?.namespace}] ${match.metadata?.content as string}`);

        if (relevantChunks.length > 0) {
          return {
            context: relevantChunks.join('\n\n'),
            sources: relevant.map(match => `Pinecone/${match.metadata?.namespace} (${(match.score as number).toFixed(2)}): ${(match.metadata?.content as string).slice(0, 90)}`),
          };
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
        relevantChunks.push(chunk);
      }
    }
    
    if (relevantChunks.length > 0) {
      const top = relevantChunks.slice(0, 2);
      return {
        context: top.map(c => c.content).join('\n\n'),
        sources: top.map(c => `Palabras clave/${c.id}: ${c.content.slice(0, 90)}`),
      };
    }
    return empty;
  } catch (error) {
    console.error("Error en RAG de Reglas Fallback:", error);
    return empty;
  }
}

// Exportamos la base para poder inyectarla a Pinecone después
export { KNOWLEDGE_BASE };
