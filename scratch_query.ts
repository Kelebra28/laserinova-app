import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const q = await prisma.quote.findFirst({
    where: { OR: [{ id: "AG-1788456612321-165" }, { folio: "AG-1788456612321-165" }] },
    include: { concepts: true }
  });
  console.log(JSON.stringify(q, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
