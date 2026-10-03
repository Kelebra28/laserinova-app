const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const os = require('os');

const prisma = new PrismaClient();

async function runBackup() {
  try {
    const [
      users, clients, quotes, quoteConcepts,
      materials, products, transactions, tasks
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.client.findMany(),
      prisma.quote.findMany(),
      prisma.quoteConcept.findMany(),
      prisma.material.findMany(),
      prisma.product.findMany(),
      prisma.financialTransaction.findMany(),
      prisma.task.findMany(),
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      data: {
        users, clients, quotes, quoteConcepts,
        materials, products, transactions, tasks
      }
    };

    // Ruta al escritorio del usuario
    const desktopPath = path.join(os.homedir(), 'Desktop', 'Respaldos_LaserInova');

    // Crear carpeta si no existe
    if (!fs.existsSync(desktopPath)) {
      fs.mkdirSync(desktopPath, { recursive: true });
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const filePath = path.join(desktopPath, `backup-${dateStr}.json`);

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

  } catch (error) {
  } finally {
    await prisma.$disconnect();
  }
}

runBackup();
