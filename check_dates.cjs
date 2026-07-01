const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const latestQuote = await prisma.quote.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log("Latest quote date:", latestQuote ? latestQuote.createdAt : "None");
}
main().catch(console.error).finally(() => prisma.$disconnect());
