const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const emails = await prisma.email.findMany({
    orderBy: { receivedAt: 'desc' },
    take: 5
  });
  console.log(emails.map(e => ({ id: e.id, uid: e.uid, subject: e.subject, from: e.from })));
}
main().finally(() => prisma.$disconnect());
