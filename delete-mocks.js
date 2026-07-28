const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const deleted = await prisma.email.deleteMany({where: {messageId: {contains: 'mock'}}});
  console.log(deleted);
}
main().finally(() => prisma.$disconnect());
