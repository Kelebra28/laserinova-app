const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.materialCategory.findMany();
  console.log(cats);
}
main().catch(console.error).finally(() => prisma.$disconnect());
