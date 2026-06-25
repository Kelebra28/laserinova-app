'use client';

import { useState, useEffect } from 'react';
import { Star, Flame, Settings, CheckCircle2, AlertTriangle, Plus, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SurveysDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [addingQuestion, setAddingQuestion] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/surveys/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestionText.trim()) return;
    setAddingQuestion(true);
    try {
      const res = await fetch('/api/admin/surveys/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newQuestionText })
      });
      if (res.ok) {
        setNewQuestionText('');
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleToggleQuestion = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/surveys/questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) fetchStats();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Encuestas de Satisfacción</h1>
          <p className="text-slate-500 font-medium">Métricas de calidad y alertas de servicio al cliente.</p>
        </div>
      </div>

      {/* Global Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Satisfacción Global</p>
            <div className="flex items-center gap-3">
              <span className="text-5xl font-black text-slate-800">
                {stats?.globalAverage.toFixed(1)}
              </span>
              <Star className="w-10 h-10 text-amber-400 fill-amber-400" />
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-slate-300">{stats?.totalResponses}</span>
            <p className="text-xs font-bold text-slate-400 uppercase">Respuestas Totales</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-[2rem] p-8 border border-red-500/20 shadow-xl shadow-red-500/20 flex items-center justify-between text-white">
          <div>
            <p className="text-sm font-bold text-red-200 uppercase tracking-widest mb-1 flex items-center gap-2">
              <Flame className="w-4 h-4" /> Alertas de Fuego
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black">
                {stats?.fireAlerts.length}
              </span>
              <span className="text-red-200 font-medium">críticas recientes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fire Alerts List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Alertas Críticas (3 estrellas o menos)
          </h2>
          
          {stats?.fireAlerts.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-slate-800 font-bold">¡Todo Excelente!</h3>
              <p className="text-slate-500 text-sm">No hay reseñas negativas recientes. Sigan así.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats?.fireAlerts.map((alert: any) => (
                <div key={alert.id} className="bg-white rounded-2xl p-5 border-l-4 border-l-red-500 border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{alert.quote?.client?.name || 'Cliente sin nombre'}</h4>
                      <Link href={`/dashboard/quotes/${alert.quoteId}`} className="text-xs font-semibold text-blue-500 hover:underline">
                        {alert.quote?.folio} - {alert.quote?.project}
                      </Link>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < Math.round(alert.averageScore) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-100'}`} />
                      ))}
                    </div>
                  </div>
                  {alert.feedbackText && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                      <p className="text-sm text-slate-600 italic">"{alert.feedbackText}"</p>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-3 font-medium uppercase">{new Date(alert.createdAt).toLocaleString('es-MX')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Questions Manager */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-500" />
            Configuración de Preguntas
          </h2>
          
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-2 space-y-1">
              {stats?.questionStats.map((q: any) => (
                <div key={q.id} className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${q.isActive ? 'bg-white' : 'bg-slate-50'}`}>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${q.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                      {q.text}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {q.average.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{q.totalAnswers} respuestas</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleQuestion(q.id, q.isActive)}
                    className={`p-2 rounded-xl transition-colors ${q.isActive ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700' : 'text-slate-300 hover:bg-emerald-50 hover:text-emerald-600'}`}
                    title={q.isActive ? "Ocultar pregunta" : "Activar pregunta"}
                  >
                    {q.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Agregar Pregunta</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Ej. ¿Qué te pareció el empaque?"
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
                />
                <button
                  onClick={handleAddQuestion}
                  disabled={addingQuestion || !newQuestionText.trim()}
                  className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-slate-800 transition-colors disabled:bg-slate-300"
                >
                  {addingQuestion ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
