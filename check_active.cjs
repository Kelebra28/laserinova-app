const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const quotes = await prisma.quote.count({ where: { active: true } });
  console.log(`Active quotes: ${quotes}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
