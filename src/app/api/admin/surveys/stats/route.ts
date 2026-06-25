import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Total responses and global average
    const responses = await prisma.surveyResponse.findMany({
      include: {
        quote: {
          select: { project: true, folio: true, client: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalResponses = responses.length;
    const globalAverage = totalResponses > 0 
      ? responses.reduce((acc, r) => acc + r.averageScore, 0) / totalResponses 
      : 0;

    // 2. Fire Alerts (responses <= 3 stars)
    const fireAlerts = responses.filter(r => r.averageScore <= 3).slice(0, 10);

    // 3. Average per question
    const questions = await prisma.surveyQuestion.findMany({
      include: {
        answers: true
      },
      orderBy: { order: 'asc' }
    });

    const questionStats = questions.map(q => {
      const answers = q.answers;
      const average = answers.length > 0 ? answers.reduce((acc, a) => acc + a.score, 0) / answers.length : 0;
      return {
        id: q.id,
        text: q.text,
        isActive: q.isActive,
        average,
        totalAnswers: answers.length
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalResponses,
        globalAverage,
        fireAlerts,
        questionStats
      }
    });

  } catch (error: any) {
    console.error('Survey stats error:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor.' }, { status: 500 });
  }
}
