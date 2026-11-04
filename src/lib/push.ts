import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@laserinova.com', pub, priv);
  configured = true;
  return true;
}

/** Manda una notificación push a los dispositivos de los administradores activos. Nunca lanza. */
export async function sendPushToAdmins(payload: PushPayload) {
  if (!configure()) {
    console.warn('VAPID no configurado: no se envió la notificación push.');
    return;
  }
  try {
    const subs = await prisma.pushSubscription.findMany();
    if (subs.length === 0) return;
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', active: true }, select: { id: true } });
    const adminIds = new Set(admins.map(a => a.id));
    const body = JSON.stringify(payload);

    await Promise.all(
      subs.filter(s => adminIds.has(s.userId)).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { endpoint: s.endpoint } }).catch(() => {});
          } else {
            console.warn('Fallo al enviar push:', e?.statusCode, e?.body || e?.message);
          }
        }
      })
    );
  } catch (e) {
    console.warn('Error enviando notificaciones push:', e);
  }
}
