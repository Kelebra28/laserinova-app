const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.task.findMany({
    where: { title: { contains: "Cobro pendiente" } },
    include: { assignees: true, tags: true }
  });
  console.log(JSON.stringify(tasks, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
