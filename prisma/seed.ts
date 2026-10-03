import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@laserinova.com";
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        name: "Administrador",
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
      },
    });
  }
}

main()
  .catch((e) => {

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
