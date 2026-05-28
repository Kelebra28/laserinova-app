const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Conectando a la base de datos...");
  
  // Buscar correos que tengan messageId con "mock-msg-" o asunto/remitente sospechoso de mock
  const deleteResult = await prisma.email.deleteMany({
    where: {
      OR: [
        { messageId: { startsWith: 'mock-msg-' } },
        { messageId: { contains: 'local-sent' } },
        { from: { contains: 'juan.perez@tiendavirtual.com' } },
        { from: { contains: 'maria.g@corporativo.com' } },
        { from: { contains: 'carlos@disenointerno.com' } },
        { from: { contains: 'test@local.dev' } },
        { from: { contains: 'noreply@spam.com' } }
      ]
    }
  });

  console.log(`Se eliminaron ${deleteResult.count} correos falsos de la base de datos.`);
}

main()
  .catch((e) => {
    console.error("Error al eliminar correos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
