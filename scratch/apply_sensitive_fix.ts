// Aplica A, B, C (mismo flujo que agent-rules.actions.ts). B y C se DESACTIVAN (reversible), no se borran.
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
dotenv.config();

const prisma = new PrismaClient();
const index = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string }).Index(process.env.PINECONE_INDEX || 'agent-bot-li');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

const A_ID = 'datos_bancarios';
const B_ID = 'rule-1791066680457-5';
const C_ID = 'EVT-009';
const BACKUP = process.argv[2];

async function main() {
  const rows = await prisma.agentRule.findMany({ where: { id: { in: [A_ID, B_ID, C_ID] } } });
  fs.writeFileSync(BACKUP, JSON.stringify(rows, null, 2));
  console.log('Respaldo:', BACKUP, rows.length, 'reglas');

  if (process.env.SKIP_A !== '1') {
  // A: quitar solo la tarjeta
  const a = rows.find((r) => r.id === A_ID)!;
  const newContent = a.content.replace(/\s*Tarjeta:\s*[\d\s]+\./, '');
  if (newContent === a.content) throw new Error('No se encontró la tarjeta en A; aborto');
  const emb = await genAI.getGenerativeModel({ model: 'gemini-embedding-2' }).embedContent(newContent);
  await index.upsert({ namespace: a.namespace, records: [{ id: a.id, values: emb.embedding.values, metadata: { title: a.title || '', content: newContent, namespace: a.namespace } }] });
  await prisma.agentRule.update({ where: { id: A_ID }, data: { content: newContent, isVectorized: true } });
  console.log('A listo:', newContent);
  }

  // B y C: desactivar (quitar de Pinecone)
  for (const id of [B_ID, C_ID]) {
    const r = rows.find((x) => x.id === id)!;
    await index.namespace(r.namespace).deleteMany({ ids: [id] });
    await prisma.agentRule.update({ where: { id }, data: { active: false, isVectorized: false } });
    console.log('Desactivada:', id);
  }
}
main().finally(() => prisma.$disconnect());
