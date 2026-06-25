import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const email = await prisma.email.findFirst({
    where: { subject: "Identificadores de maletas raíces al cielo" }
  });
  
  if (email && email.storagePath) {
    console.log("Storage Path:", email.storagePath);
    const content = await fs.readFile(path.join(process.cwd(), email.storagePath), 'utf-8');
    console.log("CONTENT:\n", content.substring(0, 1000));
  }
}

main().finally(() => prisma.$disconnect());
