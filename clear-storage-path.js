const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.email.updateMany({data: {storagePath: null}}).then(console.log).finally(() => prisma.$disconnect());
