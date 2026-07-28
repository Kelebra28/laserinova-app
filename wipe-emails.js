const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function wipe() {
  console.log('Deleting attachments...');
  await prisma.attachment.deleteMany({});
  console.log('Deleting emails...');
  await prisma.email.deleteMany({});
  console.log('DB cleared.');
  
  const storageDir = path.join(__dirname, 'storage', 'emails');
  if (fs.existsSync(storageDir)) {
    console.log('Removing storage directory...', storageDir);
    fs.rmSync(storageDir, { recursive: true, force: true });
  }
  console.log('Wipe complete.');
}

wipe().catch(console.error).finally(() => prisma.$disconnect());
