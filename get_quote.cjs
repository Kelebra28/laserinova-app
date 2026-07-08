const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const quote = await prisma.quote.findFirst({
    where: { folio: 'LI-2026-0065' },
    include: { concepts: true }
  });
  console.dir(quote, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
