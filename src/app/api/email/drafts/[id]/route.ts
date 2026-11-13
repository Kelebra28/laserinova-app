export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDraft, discardDraft } from '@/lib/email-drafts';

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const draft = await getDraft((session.user as any).id, id);
  if (!draft) return NextResponse.json({ success: false, error: 'Borrador no encontrado' }, { status: 404 });
  return NextResponse.json({ success: true, draft });
}

/** Descartar el borrador (o limpiarlo después de enviarlo). */
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ok = await discardDraft((session.user as any).id, id);
  return NextResponse.json({ success: ok });
}
