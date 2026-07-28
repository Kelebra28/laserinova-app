const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const ricardo = users.find(u => u.name.toLowerCase().includes('ricardo') || u.email.toLowerCase().includes('ricardo'));
  
  if (ricardo) {
    const newHash = await bcrypt.hash('admin123', 10);
    await prisma.user.update({
      where: { id: ricardo.id },
      data: { passwordHash: newHash }
    });
    console.log(`Password for ${ricardo.email} reset to: admin123`);
  } else {
    console.log('User ricardo not found. Users:', users.map(u => u.email).join(', '));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
