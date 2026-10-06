import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as mariadb from 'mariadb';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    return new PrismaClient();
  }

  // Parsear URL manualmente para inyectar a mariadb pool
  try {
    const url = new URL(process.env.DATABASE_URL);
    // Limpiar password bug de Hostinger y decodificar URL
    const password = decodeURIComponent(url.password).replace(/\\/g, '');
    
    const pool = mariadb.createPool({
      host: url.hostname,
      port: url.port ? parseInt(url.port) : 3306,
      user: url.username,
      password: password,
      database: url.pathname.substring(1), // remover el '/' inicial
      connectionLimit: 3, // Regla estricta Hostinger
      idleTimeout: 60, // Evita mantener conexiones zombie en Hostinger
      connectTimeout: 30000,
      acquireTimeout: 30000,
    });

    const adapter = new PrismaMariaDb(pool as any);
    return new PrismaClient({ adapter });
  } catch (error) {
    console.error("Error inicializando Prisma con Adapter:", error);
    return new PrismaClient();
  }
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
