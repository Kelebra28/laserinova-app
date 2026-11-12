// Desactiva reglas (reversible): quita de Pinecone y marca active=false. Respaldo en argv[2]; ids desde argv[3..].
import * as dotenv from 'dotenv'; import * as fs from 'fs';
import { PrismaClient } from '@prisma/client'; import { Pinecone } from '@pinecone-database/pinecone';
dotenv.config();
const prisma = new PrismaClient();
const index = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string }).Index(process.env.PINECONE_INDEX || 'agent-bot-li');
async function main() {
  const ids = process.argv.slice(3);
  const rows = await prisma.agentRule.findMany({ where: { id: { in: ids } } });
  if (rows.length !== ids.length) throw new Error('faltan reglas');
  fs.writeFileSync(process.argv[2], JSON.stringify(rows, null, 2));
  for (const r of rows) {
    await index.namespace(r.namespace).deleteMany({ ids: [r.id] });
    await prisma.agentRule.update({ where: { id: r.id }, data: { active: false, isVectorized: false } });
    console.log('Desactivada:', r.id);
  }
}
main().finally(() => prisma.$disconnect());
