export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createDraftForEmail, findPendingEmails } from '@/lib/email-drafts';

const PER_CALL = 3; // por llamada: cada borrador toma ~10 s (leer el correo + Gemini)

/** Cuántos correos recientes sin contestar hay por revisar. */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const days = Math.min(30, Math.max(1, parseInt(new URL(req.url).searchParams.get('days') || '8', 10)));
  const pending = await findPendingEmails((session.user as any).id, days);
  return NextResponse.json({ success: true, pending: pending.length });
}

/** Redacta borradores de hasta 3 pendientes y devuelve cuántos quedan; la pantalla repite hasta terminar. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const { days = 8 } = await req.json().catch(() => ({}));
  const pending = await findPendingEmails(userId, Math.min(30, Math.max(1, Number(days) || 8)));

  const drafts: { id: string; to: string; subject: string }[] = [];
  const skipped: { subject: string; reason: string }[] = [];
  const failed: { subject: string; error: string }[] = [];
  for (const e of pending.slice(0, PER_CALL)) {
    try {
      const r = await createDraftForEmail(userId, e.id);
      if (r.status === 'DRAFT') drafts.push({ id: r.id, to: r.to, subject: r.subject });
      else skipped.push({ subject: e.subject, reason: r.reason });
    } catch (err: any) {
      failed.push({ subject: e.subject, error: String(err?.message || err).slice(0, 160) });
    }
  }
  // Los que fallaron se reintentan en la siguiente llamada; para no ciclar si falla siempre, se avisa y se detiene la pantalla
  const remaining = Math.max(0, pending.length - drafts.length - skipped.length);
  return NextResponse.json({ success: true, drafts, skipped, failed, remaining });
}
