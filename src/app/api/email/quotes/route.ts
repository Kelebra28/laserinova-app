export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { listQuoteEmails } from '@/lib/email-drafts';

/** Pestaña "Cotizaciones": misma forma que /api/email/list, con quoteStatus en cada correo y `unread` = sin contestar. */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const days = Math.min(90, Math.max(1, parseInt(sp.get('days') || '30', 10)));
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '10', 10)));
  const q = (sp.get('q') || '').trim().toLowerCase();

  let all = await listQuoteEmails((session.user as any).id, days);
  const pending = all.filter((e) => e.quoteStatus === 'PENDING').length;
  if (q) all = all.filter((e) => `${e.subject} ${e.from} ${e.to} ${e.snippet || ''}`.toLowerCase().includes(q));

  return NextResponse.json({
    success: true,
    emails: all.slice((page - 1) * limit, page * limit),
    total: all.length,
    unread: pending,
    page,
    limit,
    totalPages: Math.ceil(all.length / limit),
  });
}
