const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.findFirst({ where: { name: { contains: "Eduardo Rivera" } } });
  if (!client) {
    console.log("Client not found");
    return;
  }
  console.log("Client:", client.name, client.id);
  const quotes = await prisma.quote.findMany({ where: { clientId: client.id } });
  console.log("Quotes:", quotes.map(q => ({
    folio: q.folio,
    status: q.status,
    paymentStatus: q.paymentStatus,
    total: q.total,
    realAmountCollected: q.realAmountCollected
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
