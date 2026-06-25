import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  try {
    const { quoteId } = await params;

    // Verify quote exists
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { surveyResponse: true },
    });

    if (!quote) {
      return NextResponse.json({ success: false, error: 'Cotización no encontrada.' }, { status: 404 });
    }

    if (quote.surveyResponse) {
      return NextResponse.json({ success: false, error: 'Ya has respondido esta encuesta. ¡Gracias!' }, { status: 400 });
    }

    // Fetch active questions
    const questions = await prisma.surveyQuestion.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({
      success: true,
      quote: { project: quote.project },
      questions,
    });
  } catch (error: any) {
    console.error('Error fetching survey data:', error);
    return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  try {
    const { quoteId } = await params;
    const body = await req.json();
    const { answers, feedbackText } = body; // answers is an array of { questionId, score }

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ success: false, error: 'Faltan respuestas.' }, { status: 400 });
    }

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { surveyResponse: true },
    });

    if (!quote) {
      return NextResponse.json({ success: false, error: 'Cotización no encontrada.' }, { status: 404 });
    }

    if (quote.surveyResponse) {
      return NextResponse.json({ success: false, error: 'Ya has respondido esta encuesta. ¡Gracias!' }, { status: 400 });
    }

    // Calculate average score
    const totalScore = answers.reduce((sum: number, a: any) => sum + a.score, 0);
    const averageScore = totalScore / answers.length;

    // Save response inside a transaction
    const response = await prisma.surveyResponse.create({
      data: {
        quoteId,
        averageScore,
        feedbackText: feedbackText || null,
        answers: {
          create: answers.map((a: any) => ({
            questionId: a.questionId,
            score: a.score,
          })),
        },
      },
      include: {
        answers: true,
      },
    });

    return NextResponse.json({ success: true, averageScore, response });
  } catch (error: any) {
    console.error('Error submitting survey:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor.' }, { status: 500 });
  }
}
