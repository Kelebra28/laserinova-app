const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const assignees = await prisma.taskAssignee.findMany({ include: { user: true } });
  const missing = assignees.filter(a => !a.user);
  console.log("Missing users:", missing.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
