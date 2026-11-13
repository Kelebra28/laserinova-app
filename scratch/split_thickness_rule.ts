import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client'; import { Pinecone } from '@pinecone-database/pinecone'; import { GoogleGenerativeAI } from '@google/generative-ai';
dotenv.config();
const prisma = new PrismaClient();
const index = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string }).Index(process.env.PINECONE_INDEX || 'agent-bot-li');
const embedder = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string).getGenerativeModel({ model: 'gemini-embedding-2' });
async function put(r: { id: string; namespace: string; title: string | null; content: string }) {
  const emb = await embedder.embedContent(r.content);
  await index.upsert({ namespace: r.namespace, records: [{ id: r.id, values: emb.embedding.values, metadata: { title: r.title || '', content: r.content, namespace: r.namespace } }] });
}
async function main() {
  const ac = 'Espesor máximo de corte láser en acrílico: hasta 15 mm. Si el cliente pide acrílico más grueso, dile con seguridad que ese grosor no lo cortamos con láser; no inventes alternativas ni promesas. Si insiste o duda, avisa al equipo.';
  const mdf = 'Espesor máximo de corte láser en MDF: hasta 12 mm. Sí cortamos MDF de 12 mm o menos (3, 6, 9, 12 mm). Si el cliente pide MDF más grueso, dile con seguridad que ese grosor no lo cortamos con láser; no inventes alternativas ni promesas. Si insiste o duda, avisa al equipo. NO avises al equipo si el espesor está dentro de 12 mm.';
  const old = await prisma.agentRule.update({ where: { id: '519c2e42-cabc-47ff-9a5d-d636730ad17b' }, data: { title: 'Espesor máximo corte acrílico', content: ac, isVectorized: true } });
  await put(old);
  const n = await prisma.agentRule.create({ data: { namespace: 'material_rules', title: 'Espesor máximo corte MDF', content: mdf, isVectorized: false, active: true } });
  await put(n);
  await prisma.agentRule.update({ where: { id: n.id }, data: { isVectorized: true } });
  console.log('OK', old.id, n.id);
}
main().finally(() => prisma.$disconnect());
