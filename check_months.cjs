const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const quotes = await prisma.quote.findMany({ select: { createdAt: true } });
  const months = quotes.reduce((acc, q) => {
    const m = q.createdAt.toISOString().slice(0, 7);
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});
  console.log(months);
}
main().catch(console.error).finally(() => prisma.$disconnect());
