"use server";

import { prisma } from "@/lib/prisma";

export async function getAgentRules() {
  try {
    const rules = await prisma.agentRule.findMany({
      orderBy: [
        { namespace: "asc" },
        { createdAt: "desc" }
      ]
    });
    
    return { success: true, data: rules };
  } catch (error: any) {
    console.error("Error fetching agent rules:", error);
    return { success: false, error: "Error al cargar las reglas de conocimiento." };
  }
}

// Función auxiliar para obtener el embedding en el servidor
async function generateEmbedding(text: string): Promise<number[]> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// Crear una nueva regla
export async function createAgentRule(data: { namespace: string; title: string; content: string }) {
  try {
    // 1. Guardar en MySQL
    const newRule = await prisma.agentRule.create({
      data: {
        namespace: data.namespace,
        title: data.title,
        content: data.content,
        isVectorized: false, // Empezamos en falso hasta confirmar con Pinecone
        active: true
      }
    });

    // 2. Vectorizar con Gemini
    const vectorValues = await generateEmbedding(newRule.content);

    // 3. Subir a Pinecone
    const { Pinecone } = await import("@pinecone-database/pinecone");
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
    const indexName = process.env.PINECONE_INDEX || "agent-bot-li";
    
    await pc.Index(indexName).upsert({
      namespace: newRule.namespace,
      records: [{
        id: newRule.id,
        values: vectorValues,
        metadata: {
          title: newRule.title || "",
          content: newRule.content,
          namespace: newRule.namespace
        }
      }]
    });

    // 4. Marcar como vectorizada en MySQL
    const finalizedRule = await prisma.agentRule.update({
      where: { id: newRule.id },
      data: { isVectorized: true }
    });

    return { success: true, data: finalizedRule };
  } catch (error: any) {
    console.error("Error creando regla:", error);
    return { success: false, error: "Error al crear y vectorizar la regla." };
  }
}
// Actualizar una regla existente
export async function updateAgentRule(id: string, data: { namespace: string; title: string; content: string }) {
  try {
    const existingRule = await prisma.agentRule.findUnique({ where: { id } });
    if (!existingRule) return { success: false, error: "Regla no encontrada" };

    // 1. Vectorizar el nuevo contenido
    const vectorValues = await generateEmbedding(data.content);

    // 2. Conectar a Pinecone
    const { Pinecone } = await import("@pinecone-database/pinecone");
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
    const index = pc.Index(process.env.PINECONE_INDEX || "agent-bot-li");

    // Si cambió de namespace, hay que borrarla del namespace viejo primero
    if (existingRule.namespace !== data.namespace) {
      try {
        await index.namespace(existingRule.namespace).deleteMany([id]);
      } catch (e) {
        console.log("No se pudo borrar del namespace anterior (probablemente ya no estaba)");
      }
    }

    // 3. Upsert al (nuevo o mismo) namespace
    await index.upsert({
      namespace: data.namespace,
      records: [{
        id: id,
        values: vectorValues,
        metadata: {
          title: data.title || "",
          content: data.content,
          namespace: data.namespace
        }
      }]
    });

    // 4. Actualizar en MySQL
    const updatedRule = await prisma.agentRule.update({
      where: { id },
      data: {
        namespace: data.namespace,
        title: data.title,
        content: data.content,
        isVectorized: true
      }
    });

    return { success: true, data: updatedRule };
  } catch (error: any) {
    console.error("Error actualizando regla:", error);
    return { success: false, error: "Error al actualizar y vectorizar la regla." };
  }
}

// Activar o desactivar (Borrado lógico) una regla
export async function toggleAgentRule(id: string, active: boolean) {
  try {
    const rule = await prisma.agentRule.update({
      where: { id },
      data: { active }
    });

    // Conectar a Pinecone
    const { Pinecone } = await import("@pinecone-database/pinecone");
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
    const index = pc.Index(process.env.PINECONE_INDEX || "agent-bot-li");

    if (!active) {
      // Si se desactiva, la quitamos de Pinecone para que la IA ya no la vea
      try {
        await index.namespace(rule.namespace).deleteMany([id]);
        await prisma.agentRule.update({ where: { id }, data: { isVectorized: false } });
      } catch (e) {}
    } else {
      // Si se vuelve a activar, hay que inyectarla de nuevo
      const vectorValues = await generateEmbedding(rule.content);
      await index.upsert({
        namespace: rule.namespace,
        records: [{
          id: id,
          values: vectorValues,
          metadata: { title: rule.title || "", content: rule.content, namespace: rule.namespace }
        }]
      });
      await prisma.agentRule.update({ where: { id }, data: { isVectorized: true } });
    }

    return { success: true, data: { ...rule, active, isVectorized: active } };
  } catch (error: any) {
    console.error("Error cambiando estado de regla:", error);
    return { success: false, error: "Error al cambiar el estado de la regla." };
  }
}
