import { EventEmitter } from 'events';

// TODO: ADVERTENCIA SERVERLESS (ESCALABILIDAD)
// Este Singleton de EventEmitter en memoria solo funcionará en un entorno Node.js tradicional.
// Si llegamos a desplegar en Vercel o en un entorno Serverless con múltiples instancias efímeras,
// las funciones no compartirán memoria y el SSE fallará entre ellas. 
// Para escalar a Serverless se requerirá Redis (Pub/Sub) o un servicio externo (Pusher/Ably).
class NotificationEmitter extends EventEmitter {}

// Prevención de re-instanciación del EventEmitter durante hot-reloads de desarrollo
const globalForEmitter = global as unknown as { notificationEmitter: NotificationEmitter };

export const notificationEmitter =
  globalForEmitter.notificationEmitter || new NotificationEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEmitter.notificationEmitter = notificationEmitter;
}
