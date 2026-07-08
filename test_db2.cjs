const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const configs = await prisma.costConfiguration.findMany();
  const globals = {};
  configs.forEach(c => {
    globals[c.key] = c.value;
  });
  console.log(globals);
}
main().catch(console.error).finally(() => prisma.$disconnect());
