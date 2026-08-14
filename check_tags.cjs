const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.time('db-query');
  const tags = await prisma.taskTag.findMany();
  console.log("Tags count:", tags.length);
  const tasks = await prisma.task.findMany();
  console.log("Tasks count:", tasks.length);
  console.timeEnd('db-query');
}
main().catch(console.error).finally(() => prisma.$disconnect());
