const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const msgs = await prisma.whatsAppMessage.findMany({ orderBy: { timestamp: 'desc' }, take: 5, include: { contact: true } });
  console.log(JSON.stringify(msgs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
