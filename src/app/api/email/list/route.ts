import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUserId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') || 'INBOX';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const baseWhere = folder === 'STARRED' ? { isStarred: true } : { folder };
    const q = (searchParams.get('q') || '').trim();
    const whereClause: any = {
      ...baseWhere,
      userId: currentUserId,
      ...(q ? { OR: [
        { subject: { contains: q } },
        { from: { contains: q } },
        { to: { contains: q } },
        { snippet: { contains: q } },
      ] } : {}),
    };

    const [emails, total, unread] = await Promise.all([
      prisma.email.findMany({
        where: whereClause,
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit,
        include: { attachments: { select: { filename: true, size: true } } },
      }),
      prisma.email.count({
        where: whereClause,
      }),
      // No leídos reales de la carpeta (antes el contador solo veía los 10 de la página visible)
      prisma.email.count({
        where: { ...baseWhere, userId: currentUserId, isRead: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      emails,
      total,
      unread,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Email list error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
