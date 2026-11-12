// Crea reglas (mismo flujo que createAgentRule: MySQL + embedding + Pinecone).
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client'; import { Pinecone } from '@pinecone-database/pinecone'; import { GoogleGenerativeAI } from '@google/generative-ai';
dotenv.config();
const prisma = new PrismaClient();
const index = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string }).Index(process.env.PINECONE_INDEX || 'agent-bot-li');
const embedder = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string).getGenerativeModel({ model: 'gemini-embedding-2' });
const NEW = [
  { namespace: 'sales_policies', title: 'Horario de atención', content: 'Horario de atención: lunes a viernes de 9:00 a 18:00 y sábados de 11:00 a 16:00. Domingos cerrado.' },
  { namespace: 'sales_policies', title: 'Tiempo de entrega habitual', content: 'Tiempo de entrega: normalmente de 3 a 4 días hábiles. No prometas una fecha exacta: se confirma con el equipo antes de iniciar el trabajo. Si el cliente necesita una fecha específica o urgente, avisa al equipo para validarlo.' },
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
