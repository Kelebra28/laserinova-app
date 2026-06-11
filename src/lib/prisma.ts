import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Force client reconstruction to clear cached schema definitions
if (globalForPrisma.prisma) {
  globalForPrisma.prisma.$disconnect().catch(() => {});
}

export const prisma = new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
