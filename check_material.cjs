const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const materials = await prisma.material.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(materials.map(m => ({name: m.name, price: m.sheetPrice, l: m.length, w: m.width, c: m.pricePerCm2})));
}
main().catch(console.error).finally(() => prisma.$disconnect());
