import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 });

    const maxOrderQ = await prisma.surveyQuestion.findFirst({ orderBy: { order: 'desc' } });
    const newOrder = maxOrderQ ? maxOrderQ.order + 1 : 1;

    const newQuestion = await prisma.surveyQuestion.create({
      data: { text, order: newOrder }
    });

    return NextResponse.json({ success: true, question: newQuestion });
  } catch (error: any) {
    console.error('Survey question error:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor.' }, { status: 500 });
  }
}
