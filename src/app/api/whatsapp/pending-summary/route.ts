export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { sendPendingSummary } from '@/server/services/pending-summary.service';

/**
 * Resumen de pendientes de WhatsApp para los administradores. Lo llama el cron de Vercel (ver vercel.json),
 * que manda solo la cabecera Authorization con CRON_SECRET. Con ?dry=1 devuelve el texto sin enviarlo.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET no está configurada' }, { status: 503 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dryRun = new URL(req.url).searchParams.get('dry') === '1';
  const result = await sendPendingSummary({ dryRun });
  return NextResponse.json({ success: true, sent: result.sent, total: result.total, ...(dryRun ? { text: result.text } : {}) });
}
