import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') || 'INBOX';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const whereClause = folder === 'STARRED' ? { isStarred: true } : { folder };

    const [emails, total] = await Promise.all([
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
    ]);

    return NextResponse.json({
      success: true,
      emails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Email list error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
