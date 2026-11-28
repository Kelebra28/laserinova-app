/** Ajustes de la conexión a la base de datos (MySQL en Hostinger, a veces no contesta). */

/** Espera antes de cada reintento, en milisegundos. El largo de la lista es el número de reintentos. */
export const DB_RETRY_DELAYS_MS = [500, 1500] as const;

/** P1001 = no se pudo abrir la conexión: la consulta nunca llegó a la base, así que repetirla no duplica nada. */
export const DB_UNREACHABLE_CODE = 'P1001';

/** Al fallar la primera conexión Prisma no manda código, solo este texto. */
export const DB_UNREACHABLE_TEXT = "Can't reach database server";
