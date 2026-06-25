'use client';

import { useState } from 'react';
import { Star, MessageSquare, MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function SurveyForm({ 
  quoteId, 
  projectData, 
  questions 
}: { 
  quoteId: string, 
  projectData: any, 
  questions: any[] 
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [averageScore, setAverageScore] = useState(0);

  const handleStarClick = (questionId: string, score: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: score }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      alert('Por favor califica todas las preguntas antes de enviar.');
      return;
    }

    setSubmitting(true);
    
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, score]) => ({ questionId, score })),
        feedbackText: feedback,
      };

      const res = await fetch(`/api/s/${quoteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (data.success) {
        setAverageScore(data.averageScore);
        setSubmitted(true);
      } else {
        alert(data.error || 'Error al enviar la encuesta.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al enviar la encuesta.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    const isGoodReview = averageScore >= 4;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-slate-100 text-center relative overflow-hidden">
          {isGoodReview && (
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-400" />
          )}
          
          <CheckCircle2 className={`w-20 h-20 mx-auto mb-6 ${isGoodReview ? 'text-emerald-500' : 'text-slate-400'}`} />
          
          <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-4">
            ¡Gracias por tus comentarios!
          </h2>
          
          {isGoodReview ? (
            <div className="mt-8 space-y-6">
              <p className="text-slate-600 font-medium">
                Nos alegra mucho saber que tuviste una excelente experiencia con nosotros. ¡Gracias por confiar en Laser Inova!
              </p>
              {/* 
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-sm text-slate-500 mb-4">
                  Copia tu comentario y pégalo en Google Maps. ¡Nos ayuda muchísimo a crecer!
                </p>
                <a 
                  href="https://g.page/r/YOUR_GOOGLE_MAPS_LINK/review" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"
                >
                  <MapPin className="w-5 h-5 text-red-400" />
                  Dejar reseña en Google Maps
                </a>
              </div>
              */}
            </div>
          ) : (
            <div className="mt-8">
              <p className="text-slate-600 font-medium bg-red-50 text-red-800 p-6 rounded-2xl border border-red-100">
                Lamentamos que tu experiencia no haya sido la mejor. Hemos notificado inmediatamente a nuestro equipo de atención al cliente para revisar tu caso y mejorar. ¡Gracias por ayudarnos a crecer!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex justify-center py-12 px-4 sm:px-6 relative overflow-hidden z-0">
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl" />
        <div className="absolute top-40 -left-20 w-72 h-72 bg-indigo-200/40 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight mb-4">
            Tu opinión es oro ✨
          </h1>
          <p className="text-slate-500 text-lg font-medium">
            Ayúdanos a mejorar evaluando tu experiencia en: <br/>
            <span className="text-indigo-950 font-black bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-2xl shadow-sm border border-indigo-100 mt-3 inline-block">
              {projectData?.project}
            </span>
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden">
          <div className="p-8 sm:p-10 space-y-10">
            
            {questions.map((q, idx) => (
              <div key={q.id} className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800">
                  <span className="text-slate-400 mr-2">{idx + 1}.</span> {q.text}
                </h3>
                <div className="flex gap-2 sm:gap-4 justify-center py-6 bg-slate-50/50 rounded-2xl border border-slate-100/50 transition-all hover:bg-slate-50">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleStarClick(q.id, star)}
                      className="p-1 sm:p-2 transition-all duration-300 hover:scale-125 active:scale-90 outline-none"
                    >
                      <Star 
                        className={`w-10 h-10 sm:w-12 sm:h-12 transition-colors duration-300 ${
                          (answers[q.id] || 0) >= star 
                            ? 'fill-amber-400 text-amber-400 drop-shadow-sm' 
                            : 'fill-slate-100 text-slate-200'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-slate-400" />
                Comentarios adicionales (Opcional)
              </h3>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="¿Hay algo más que te gustaría comentarnos?"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[120px] focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all resize-y text-slate-700"
              />
            </div>

          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting || Object.keys(answers).length < questions.length}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-4 px-8 rounded-xl transition-all active:scale-95 shadow-lg shadow-slate-900/20 disabled:shadow-none"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
              ) : (
                'Enviar Respuestas'
              )}
            </button>
          </div>
        </div>
        
        <p className="text-center text-xs text-slate-400 mt-8 font-medium">
          Tus respuestas son confidenciales y nos ayudan a brindarte un mejor servicio.
        </p>
      </div>
    </div>
  );
}
