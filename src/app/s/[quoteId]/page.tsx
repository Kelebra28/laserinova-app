import { prisma } from '@/lib/prisma';
import { AlertCircle } from 'lucide-react';
import SurveyForm from './SurveyForm';

export const dynamic = 'force-dynamic';

export default async function PublicSurveyPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { surveyResponse: true },
  });

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">¡Oops!</h1>
          <p className="text-slate-500">Cotización no encontrada.</p>
        </div>
      </div>
    );
  }

  if (quote.surveyResponse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">¡Muchas gracias!</h1>
          <p className="text-slate-500">Ya hemos recibido tus respuestas para esta encuesta.</p>
        </div>
      </div>
    );
  }

  const questions = await prisma.surveyQuestion.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });

  return <SurveyForm quoteId={quoteId} projectData={{ project: quote.project }} questions={questions} />;
}
