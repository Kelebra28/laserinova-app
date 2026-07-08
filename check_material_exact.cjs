const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const materials = await prisma.material.findMany({
    where: { name: { contains: 'cristal' } }
  });
  console.log(materials.map(m => m.name));
}
main().catch(console.error).finally(() => prisma.$disconnect());
