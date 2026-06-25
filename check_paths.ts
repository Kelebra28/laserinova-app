import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const allEmails = await prisma.email.findMany({ select: { id: true, subject: true, storagePath: true }});
  
  const pathMap = new Map();
  for (const email of allEmails) {
    if (!email.storagePath) continue;
    if (pathMap.has(email.storagePath)) {
      console.log(`CONFLICTO en path ${email.storagePath}:`);
      console.log(`  1. ${pathMap.get(email.storagePath).subject}`);
      console.log(`  2. ${email.subject}`);
    } else {
      pathMap.set(email.storagePath, email);
    }
  }
}

main().finally(() => prisma.$disconnect());
