import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const materials = await prisma.material.findMany({ select: { name: true } });
  console.log("Materiales:", materials.map(m => m.name));
}

main().finally(() => prisma.$disconnect());
