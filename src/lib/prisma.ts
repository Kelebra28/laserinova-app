import { PrismaClient } from "@prisma/client";
import { withDbRetry } from "@/lib/prisma-retry";

const globalForPrisma = global as unknown as { 
  prisma: PrismaClient;
};

function createPrismaClient() {
  // La extensión no agrega métodos, solo envuelve cada consulta; se conserva el tipo del cliente normal.
  return new PrismaClient().$extends({
    query: {
      $allOperations: ({ args, query }) => withDbRetry(() => query(args)),
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
