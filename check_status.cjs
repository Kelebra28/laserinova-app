const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const quotes = await prisma.quote.findMany({ select: { status: true } });
  const statuses = quotes.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1;
    return acc;
  }, {});
  console.log(statuses);
}
main().catch(console.error).finally(() => prisma.$disconnect());
