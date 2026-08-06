const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const quote = await prisma.quote.findUnique({ where: { folio: 'LI-2026-0094' } });
  console.log('Quote:', quote);
  
  const prs = await prisma.paymentRequest.findMany({ where: { quoteId: quote.id } });
  console.log('Payment Requests:', prs);
  
  const tasks = await prisma.task.findMany({ where: { title: { contains: 'LI-2026-0094' } } });
  console.log('Tasks:', tasks);
}

main().catch(console.error).finally(() => prisma.$disconnect());
