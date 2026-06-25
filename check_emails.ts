import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const emails = await prisma.email.findMany({
    where: {
      OR: [
        { subject: { contains: "Identificadores" } },
        { from: { contains: "Carmen Romo" } }
      ]
    },
    select: { id: true, subject: true, from: true, threadId: true, snippet: true }
  });
  console.log(JSON.stringify(emails, null, 2));
}

main().finally(() => prisma.$disconnect());
