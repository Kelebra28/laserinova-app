const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'ricardob@laserinova.com';
  const passwordHash = await bcrypt.hash('ricardo123', 10);
  
  await prisma.user.update({
    where: { email },
    data: { passwordHash }
  });
  console.log('Password reset successfully');
}
main().catch(console.error).finally(() => prisma.$disconnect());
