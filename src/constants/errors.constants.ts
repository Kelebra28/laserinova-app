/** Textos de error que se le muestran al usuario. */

/**
 * En producción Next oculta el mensaje de los errores del servidor; al navegador solo llega
 * "Minified React error #441" o el aviso genérico de Server Components.
 */
export const HIDDEN_SERVER_ERROR_PATTERN = /Minified React error #441|Server Components render/i;

/** Errores crudos de Prisma: traen nombres de tablas y la dirección del servidor, no van a pantalla. */
export const DB_ERROR_PATTERN = /Invalid `[^`]*prisma\.|Timed out fetching a new connection|Can't reach database server/i;

export const DB_UNREACHABLE_MESSAGE =
  'No hubo conexión con la base de datos. Intenta de nuevo en un momento; si estabas guardando algo, revisa primero si quedó.';

export const DB_ERROR_MESSAGE = 'La base de datos no pudo completar la operación. Revisa si el cambio quedó antes de repetirlo.';

export const HIDDEN_SERVER_ERROR_MESSAGE =
  'El servidor no pudo completar la operación. Si estabas guardando o enviando algo, revisa si quedó antes de repetirlo.';
