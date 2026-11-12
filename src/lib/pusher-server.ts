import 'server-only';
import PusherServer from 'pusher';

// Instancia del servidor (para disparar eventos desde Server Actions / API Routes).
// Vive aparte de lib/pusher.ts para que el SDK de servidor nunca entre al bundle del navegador.
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});
