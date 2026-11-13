export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { markAnswered } from '@/lib/email-drafts';

/** Marca una o varias cotizaciones como "ya contestadas" (por WhatsApp, teléfono, otro programa…). */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { emailIds } = await req.json().catch(() => ({}));
  if (!Array.isArray(emailIds) || !emailIds.length) return NextResponse.json({ error: 'Faltan emailIds' }, { status: 400 });
  const n = await markAnswered((session.user as any).id, emailIds.slice(0, 100).map(String));
  return NextResponse.json({ success: true, marcadas: n });
}
