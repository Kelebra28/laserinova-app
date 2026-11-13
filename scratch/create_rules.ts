// Crea reglas (mismo flujo que createAgentRule: MySQL + embedding + Pinecone).
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client'; import { Pinecone } from '@pinecone-database/pinecone'; import { GoogleGenerativeAI } from '@google/generative-ai';
dotenv.config();
const prisma = new PrismaClient();
const index = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string }).Index(process.env.PINECONE_INDEX || 'agent-bot-li');
const embedder = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string).getGenerativeModel({ model: 'gemini-embedding-2' });
const NEW = [
  { namespace: 'material_rules', title: 'Espesores máximos de corte láser', content: 'Espesores máximos de corte láser: acrílico hasta 15 mm y MDF hasta 12 mm. Si el cliente pide un espesor mayor, dile con seguridad que ese grosor no lo cortamos con láser; no inventes alternativas ni promesas. Si insiste o duda, avisa al equipo.' },
];
async function main() {
  for (const d of NEW) {
    const r = await prisma.agentRule.create({ data: { ...d, isVectorized: false, active: true } });
    const emb = await embedder.embedContent(r.content);
    await index.upsert({ namespace: r.namespace, records: [{ id: r.id, values: emb.embedding.values, metadata: { title: r.title || '', content: r.content, namespace: r.namespace } }] });
    await prisma.agentRule.update({ where: { id: r.id }, data: { isVectorized: true } });
    console.log('Creada:', r.id, r.title);
  }
}
main().finally(() => prisma.$disconnect());
