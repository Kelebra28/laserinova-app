export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createDraftForEmail } from '@/lib/email-drafts';

/** Redacta con IA la respuesta de UN correo y la deja como borrador. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { emailId } = await req.json().catch(() => ({}));
  if (!emailId) return NextResponse.json({ error: 'Falta emailId' }, { status: 400 });
  try {
    const r = await createDraftForEmail((session.user as any).id, emailId, { explicit: true });
    return NextResponse.json({ success: true, ...r });
  } catch (e: any) {
    console.error('Error redactando borrador:', e?.message);
    return NextResponse.json({ success: false, error: e?.message || 'No se pudo redactar la respuesta' }, { status: 500 });
  }
}
