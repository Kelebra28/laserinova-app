const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.count();
  const clients = await prisma.client.count();
  const quotes = await prisma.quote.count();
  console.log(`Users: ${users}, Clients: ${clients}, Quotes: ${quotes}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
