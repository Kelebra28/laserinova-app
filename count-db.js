const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.email.count().then(console.log).finally(() => prisma.$disconnect());
