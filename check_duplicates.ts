import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const msgId = "<PH0PR08MB110977DC015613B82A481C567A1ED2@PH0PR08MB11097.namprd08.prod.outlook.com>";
  const emails = await prisma.email.findMany({
    where: { messageId: msgId },
    select: { id: true, subject: true, messageId: true }
  });
  console.log("Emails with same messageId:", JSON.stringify(emails, null, 2));
}
main().finally(() => prisma.$disconnect());
