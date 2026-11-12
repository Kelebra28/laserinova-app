// Reescribe RESP-046 (mismo flujo que updateAgentRule). Respaldo del original en argv[2].
import * as dotenv from 'dotenv'; import * as fs from 'fs';
import { PrismaClient } from '@prisma/client'; import { Pinecone } from '@pinecone-database/pinecone'; import { GoogleGenerativeAI } from '@google/generative-ai';
dotenv.config();
const prisma = new PrismaClient();
const index = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string }).Index(process.env.PINECONE_INDEX || 'agent-bot-li');
async function main() {
  const r = await prisma.agentRule.findUniqueOrThrow({ where: { id: 'RESP-046' } });
  fs.writeFileSync(process.argv[2], JSON.stringify(r, null, 2));
  const content = r.content.replace('Soy Raúl Basurto, de Laser Inova.', 'Soy el asistente de Laser Inova.');
  if (content === r.content) throw new Error('texto no encontrado');
  const emb = await new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string).getGenerativeModel({ model: 'gemini-embedding-2' }).embedContent(content);
  await index.upsert({ namespace: r.namespace, records: [{ id: r.id, values: emb.embedding.values, metadata: { title: r.title || '', content, namespace: r.namespace } }] });
  await prisma.agentRule.update({ where: { id: r.id }, data: { content, isVectorized: true } });
  console.log('Listo:', content);
}
main().finally(() => prisma.$disconnect());
