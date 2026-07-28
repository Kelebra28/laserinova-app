const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const emails = await prisma.email.findMany({
    where: { subject: { contains: "Lápiz" } },
    select: { subject: true, messageId: true, storagePath: true, id: true }
  });
  console.log(JSON.stringify(emails, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
