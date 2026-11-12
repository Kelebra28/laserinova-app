import PusherClient from 'pusher-js';

// Instancia del cliente (para suscribirse a eventos desde Componentes React).
// El de servidor está en lib/pusher-server.ts.
let pusherClientInstance: PusherClient | null = null;
export const getPusherClient = () => {
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return pusherClientInstance;
};
