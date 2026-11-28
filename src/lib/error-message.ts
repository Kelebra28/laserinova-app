import { DB_UNREACHABLE_TEXT } from '@/constants/database.constants';
import {
  DB_ERROR_MESSAGE,
  DB_ERROR_PATTERN,
  DB_UNREACHABLE_MESSAGE,
  HIDDEN_SERVER_ERROR_MESSAGE,
  HIDDEN_SERVER_ERROR_PATTERN,
} from '@/constants/errors.constants';

/** Mensaje de un error listo para pantalla; cambia los textos técnicos por uno entendible. Sirve en servidor y navegador. */
export function getErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : '';
  if (HIDDEN_SERVER_ERROR_PATTERN.test(message)) return HIDDEN_SERVER_ERROR_MESSAGE;
  if (message.includes(DB_UNREACHABLE_TEXT)) return DB_UNREACHABLE_MESSAGE;
  if (DB_ERROR_PATTERN.test(message)) return DB_ERROR_MESSAGE;
  return message || fallback;
}
