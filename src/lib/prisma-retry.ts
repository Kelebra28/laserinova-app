import { DB_RETRY_DELAYS_MS, DB_UNREACHABLE_CODE, DB_UNREACHABLE_TEXT } from '@/constants/database.constants';

export function isDbUnreachable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const { code, errorCode } = error as Error & { code?: string; errorCode?: string };
  return code === DB_UNREACHABLE_CODE || errorCode === DB_UNREACHABLE_CODE || error.message.includes(DB_UNREACHABLE_TEXT);
}

/** Repite la operación solo si no se pudo conectar; cualquier otro error sale de inmediato. */
export async function withDbRetry<T>(run: () => PromiseLike<T>, delays: readonly number[] = DB_RETRY_DELAYS_MS): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= delays.length || !isDbUnreachable(error)) throw error;
      console.warn(`Base de datos inalcanzable, reintento ${attempt + 1} de ${delays.length}`);
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}
