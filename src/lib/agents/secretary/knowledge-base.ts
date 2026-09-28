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

// RAG Local basado en palabras clave (Fake RAG)
// Es instantáneo, no consume API ni tira errores 404 de Google.
export async function getRelevantRules(userMessage: string, genAI?: GoogleGenerativeAI): Promise<string> {
  if (!userMessage || userMessage.trim().length === 0) return "";
  
  try {
    const query = userMessage.toLowerCase();
    const relevantChunks = [];
    
    for (const chunk of KNOWLEDGE_BASE) {
      const keywords = chunk.keywords.split(',').map(k => k.trim().toLowerCase());
      
      // Si el mensaje del usuario contiene alguna de las palabras clave de la regla
      const isRelevant = keywords.some(keyword => query.includes(keyword));
      
      if (isRelevant) {
        relevantChunks.push(chunk.content);
      }
    }
    
    // Devolvemos máximo 2 reglas para no inflar el prompt
    if (relevantChunks.length > 0) {
      return relevantChunks.slice(0, 2).join('\n\n');
    }
    
    return "";
  } catch (error) {
    console.error("Error en RAG de Reglas:", error);
    return "";
  }
}
