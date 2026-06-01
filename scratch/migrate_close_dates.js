const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const quotesToMigrate = await prisma.quote.findMany({
    where: {
      paymentStatus: { in: ["PARTIAL", "PAID"] },
      closeDate: null
    },
    select: {
      id: true,
      folio: true,
      updatedAt: true
    }
  });

  console.log(`Found ${quotesToMigrate.length} quotes to migrate.`);

  for (const q of quotesToMigrate) {
    await prisma.quote.update({
      where: { id: q.id },
      data: {
        closeDate: q.updatedAt
      }
    });
    console.log(`Migrated quote ${q.folio}: closeDate set to ${q.updatedAt}`);
  }

  console.log("Migration complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
