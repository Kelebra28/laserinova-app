const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categoryId = '296e920b-0c50-4319-a161-7fb6956552a7'; // Acrílico
  
  const length = 120;
  const width = 240;
  const sheetPrice = 2420;
  const guardPercentage = 1.2;
  const area = length * width;
  const productionPrice = sheetPrice * guardPercentage;
  const pricePerCm2 = productionPrice / area;

  const mat = await prisma.material.create({
    data: {
      categoryId,
      name: 'Negro mate x un lado y brillante x el otro',
      brand: 'Desconocida',
      color: 'Negro mate',
      length,
      width,
      sheetPrice,
      guardPercentage,
      productionPrice,
      pricePerCm2,
      notes: 'Mate por un lado, brillante por el otro',
    }
  });
  console.log("Material agregado:", mat);
}

main().catch(console.error).finally(() => prisma.$disconnect());
