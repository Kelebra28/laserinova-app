const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Intentando conectar con Prisma...");
  try {
    const quotes = await prisma.quote.findMany({
      take: 1
    });
    console.log("¡Conexión exitosa! Encontrada quote:", quotes);
  } catch (err) {
    console.error("Error al conectar con Prisma:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
