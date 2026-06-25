import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const emails = await prisma.email.findMany({
    where: { subject: { contains: "Identificadores" } },
    select: { id: true, subject: true, messageId: true }
  });
  console.log(JSON.stringify(emails, null, 2));
}
main().finally(() => prisma.$disconnect());
