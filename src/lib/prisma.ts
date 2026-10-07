import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as mariadb from 'mariadb';

const globalForPrisma = global as unknown as { 
  prisma: PrismaClient;
  mariadbPool: mariadb.Pool;
};

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    return new PrismaClient();
  }

  try {
    const url = new URL(process.env.DATABASE_URL);
    const password = decodeURIComponent(url.password).replace(/\\/g, '');
    
    // Reutilizar el pool si ya existe en desarrollo para evitar fugas de conexiones
    const pool = globalForPrisma.mariadbPool || mariadb.createPool({
      host: url.hostname,
      port: url.port ? parseInt(url.port) : 3306,
      user: url.username,
      password: password,
      database: url.pathname.substring(1),
      connectionLimit: process.env.NODE_ENV === 'development' ? 1 : 3, // REGLA ESTRICTA DE HOSTINGER
      idleTimeout: 60000, 
      connectTimeout: 10000, // 10 segundos máximo para fallar rápido
      acquireTimeout: 15000,
      charset: "utf8mb4",
      collation: "utf8mb4_unicode_ci",
    });

    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.mariadbPool = pool;
    }

    const adapter = new PrismaMariaDb(pool as any);
    return new PrismaClient({ adapter });
  } catch (error) {
    console.error("Error inicializando Prisma con Adapter:", error);
    return new PrismaClient();
  }
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
