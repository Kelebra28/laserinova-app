const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'raball@laserinova.com';
  console.log(`Resetting password for: ${email}`);
  const hashedPassword = await bcrypt.hash('LaserInova2026', 10);
  
  await prisma.user.update({
    where: { email: email },
    data: { passwordHash: hashedPassword }
  });
  console.log(`Success! Password reset for ${email}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
