import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as mariadb from 'mariadb';

const globalForPrisma = global as unknown as { 
  prisma: PrismaClient;
};

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    return new PrismaClient();
  }

  const url = new URL(process.env.DATABASE_URL);
  const password = decodeURIComponent(url.password).replace(/\\/g, '');
  
  const pool = mariadb.createPool({
    host: url.hostname,
    port: url.port ? parseInt(url.port) : 3306,
    user: url.username,
    password: password,
    database: url.pathname.substring(1),
    connectionLimit: process.env.NODE_ENV === 'development' ? 5 : 20,
  });

  const adapter = new PrismaMariaDb(pool as any);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
