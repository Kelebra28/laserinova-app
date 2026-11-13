export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * IDs de los correos de la misma conversación (por Message-ID / In-Reply-To), del más viejo al más nuevo.
 * Sube hasta el mensaje raíz y baja por las respuestas; incluye también lo enviado, aunque esté en otra carpeta.
 */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const start = await prisma.email.findFirst({ where: { id, userId }, select: { id: true, messageId: true, threadId: true } });
  if (!start) return NextResponse.json({ success: false, error: 'Email not found' }, { status: 404 });

  const found = new Map<string, { id: string; messageId: string; threadId: string | null; receivedAt: Date }>();
  const seen = new Set<string>();
  let frontier: string[] = [start.messageId, ...(start.threadId ? [start.threadId] : [])];

  // Máximo 6 vueltas: cubre cadenas largas sin arriesgar un ciclo infinito
  for (let i = 0; i < 6 && frontier.length; i++) {
    const keys = frontier.filter((k) => !seen.has(k));
    keys.forEach((k) => seen.add(k));
    if (!keys.length) break;
    const rows = await prisma.email.findMany({
      where: { userId, OR: [{ messageId: { in: keys } }, { threadId: { in: keys } }] },
      select: { id: true, messageId: true, threadId: true, receivedAt: true },
      take: 40,
    });
    frontier = [];
    for (const r of rows) {
      if (found.has(r.id)) continue;
      found.set(r.id, r);
      frontier.push(r.messageId);
      if (r.threadId) frontier.push(r.threadId);
    }
  }
  found.set(start.id, found.get(start.id) ?? { ...start, receivedAt: new Date() });

  const ids = [...found.values()].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime()).slice(-20).map((r) => r.id);
  return NextResponse.json({ success: true, ids });
}
