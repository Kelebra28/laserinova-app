import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tags = await prisma.taskTag.findMany();
  console.log("Tags count:", tags.length);
  const tasks = await prisma.task.findMany();
  console.log("Tasks count:", tasks.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
