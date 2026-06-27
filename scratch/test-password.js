const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'ricardob@laserinova.com' }
  });

  if (!user) {
    console.log("User not found!");
    return;
  }

  const commonPasswords = [
    'laser123',
    'ricardo123',
    'admin123',
    'crm_laserInova98',
    'Laser123!',
    'LaserInova123',
    'password'
  ];

  for (const pwd of commonPasswords) {
    const isValid = await bcrypt.compare(pwd, user.passwordHash);
    if (isValid) {
      console.log(`Password found: ${pwd}`);
      return;
    }
  }

  console.log("Password not found in common list.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
