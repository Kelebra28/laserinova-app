import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const emails = await prisma.email.findMany({
    where: { subject: { contains: "Formulario UNETE" } },
    select: { id: true, subject: true, messageId: true, snippet: true }
  });
  console.log("UNETE Emails:", JSON.stringify(emails, null, 2));
}
main().finally(() => prisma.$disconnect());
