export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runMailboxSync } from '@/lib/email-sync';
import { notificationEmitter } from '@/lib/notification-emitter';
import { autoDraftNew } from '@/lib/email-drafts';

/**
 * Revisión programada del correo: no depende de que alguien tenga la pantalla abierta. La llama el cron
 * del hosting cada minuto con la clave secreta (CRON_SECRET) y trae solo lo nuevo de cada buzón.
 *   curl -s -H "Authorization: Bearer $CRON_SECRET" https://app.laserinova.com/api/email/cron
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET no está configurada' }, { status: 503 });
  const auth = req.headers.get('authorization') || '';
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Solo los usuarios con buzón propio configurado
  const users = await prisma.user.findMany({
    where: { emailPasswordEncrypted: { not: null } },
    select: { id: true, email: true },
  });

  const report: Record<string, string | number> = {};
  // En paralelo y con tope de 40 s por buzón: uno lento (p. ej. su primera importación) no frena a los demás.
  await Promise.all(users.map(async (u) => {
    try {
      const r = await runMailboxSync(u.id, { full: false, timeoutMs: 40000 });
      if (!r) { report[u.email] = 'ocupado'; return; }
      report[u.email] = r.syncedCount;
      if (r.newInbox.length) {
        await notificationEmitter.emit('email_new', { email: u.email, count: r.newInbox.length, latest: r.newInbox[0] });
      }
      // Borrador de lo nuevo que merece respuesta (solo borrador, nunca se envía)
      const ad = await autoDraftNew(u.id);
      if (ad.drafts) {
        report[`${u.email} borradores`] = ad.drafts;
        await notificationEmitter.emit('email_draft', { email: u.email, count: ad.drafts, latest: ad.items[0] });
      }
    } catch (e: any) {
      report[u.email] = `error: ${String(e?.message || e).slice(0, 80)}`;
    }
  }));
  return NextResponse.json({ success: true, report });
}

export const GET = handle;
export const POST = handle;
