const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.task.updateMany({
    where: { priority: 'MEDIUM' },
    data: { priority: 'NORMAL' },
  });
  console.log("Updated tasks:", result.count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
