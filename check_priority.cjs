const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tasks = await prisma.task.findMany({ select: { priority: true, status: true } });
  const priorities = new Set(tasks.map(t => t.priority));
  console.log("Priorities:", Array.from(priorities));
  const statuses = new Set(tasks.map(t => t.status));
  console.log("Statuses:", Array.from(statuses));
}
main().catch(console.error).finally(() => prisma.$disconnect());
