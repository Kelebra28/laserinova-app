// Crea reglas de corte de metal y réplicas; alinea RESP-043 (respaldo en argv[2]).
import * as dotenv from 'dotenv'; import * as fs from 'fs';
import { PrismaClient } from '@prisma/client'; import { Pinecone } from '@pinecone-database/pinecone'; import { GoogleGenerativeAI } from '@google/generative-ai';
dotenv.config();
const prisma = new PrismaClient();
const index = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string }).Index(process.env.PINECONE_INDEX || 'agent-bot-li');
const embedder = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string).getGenerativeModel({ model: 'gemini-embedding-2' });
async function put(r: { id: string; namespace: string; title: string | null; content: string }) {
  const emb = await embedder.embedContent(r.content);
  await index.upsert({ namespace: r.namespace, records: [{ id: r.id, values: emb.embedding.values, metadata: { title: r.title || '', content: r.content, namespace: r.namespace } }] });
}
const METALES = 'acero inoxidable, lámina negra y lámina galvanizada';
async function main() {
  const old = await prisma.agentRule.findUniqueOrThrow({ where: { id: 'RESP-043' } });
  fs.writeFileSync(process.argv[2], JSON.stringify(old, null, 2));
  const upd = await prisma.agentRule.update({ where: { id: old.id }, data: { isVectorized: true,
    content: `Ese material no lo trabajamos actualmente para corte. En metal solo cortamos ${METALES}; manejamos grabado sobre metal con láser de fibra.` } });
  await put(upd);
  const NEW = [
    { namespace: 'material_rules', title: 'Corte de metal: materiales permitidos', content: `Corte de metal: solo cortamos ${METALES}. Cualquier otro metal (aluminio, latón, cobre, cold rolled, tubo) no lo cortamos; recházalo con seguridad. Para cotizar pide metal, espesor, medidas, cantidad y archivo vectorial. El precio lo confirma el equipo.` },
    { namespace: 'product_protocols', title: 'Réplicas y piezas de metal sin proveedor', content: `Réplicas: no manejamos réplicas como servicio, no las ofrezcas ni prometas "regrabar" o "fabricar la réplica". Lo que se hace es un trabajo nuevo de corte y/o grabado a partir del archivo y el texto completo que el cliente proporcione. Si el cliente no lleva el metal, lo primero es cortarlo (solo ${METALES}) y después grabarlo. Si solo tiene una foto o la pieza está desgastada, el diseño hay que trazarlo y tiene costo extra, y el cliente debe dar el texto exacto y las medidas. Avisa al equipo antes de confirmar que se puede.` },
  ];
  for (const d of NEW) {
    const r = await prisma.agentRule.create({ data: { ...d, isVectorized: false, active: true } });
    await put(r);
    await prisma.agentRule.update({ where: { id: r.id }, data: { isVectorized: true } });
    console.log('Creada:', r.id, r.title);
  }
}
main().finally(() => prisma.$disconnect());
