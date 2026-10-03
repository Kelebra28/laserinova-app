import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { KNOWLEDGE_BASE } from '@/lib/agents/secretary/knowledge-base';

export async function GET() {
  try {
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
      return new NextResponse('Faltan variables de entorno de Pinecone', { status: 400 });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      return new NextResponse('Falta GEMINI_API_KEY', { status: 400 });
    }

    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index(process.env.PINECONE_INDEX);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

    const vectors = [];

    for (const chunk of KNOWLEDGE_BASE) {
      const result = await embeddingModel.embedContent(chunk.content);
      const embedding = result.embedding.values;
      
      vectors.push({
        id: chunk.id,
        values: embedding,
        metadata: {
          content: chunk.content,
          keywords: chunk.keywords
        }
      });
    }

    // Subir a Pinecone en un solo lote
    await index.upsert({ records: vectors });

    return NextResponse.json({ 
      success: true, 
      message: `Se sincronizaron ${vectors.length} reglas en Pinecone exitosamente.` 
    });
  } catch (error: any) {
    console.error("Error sincronizando con Pinecone:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
