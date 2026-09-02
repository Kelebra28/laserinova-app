"use client";

import { useState } from "react";
import { processAgentCommand } from "@/server/actions/agent.actions";
import { Sparkles, Loader2, Send, FileText } from "lucide-react";

export function AgentChat() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{success: boolean; message: string; details?: any[]} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse(null);

    try {
      const result = await processAgentCommand(prompt);
      setResponse(result);
    } catch (error: any) {
      setResponse({ success: false, message: error?.message || "Error al procesar el comando" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[600px] text-base">
      {/* Header */}
      <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-zinc-800 dark:text-zinc-100">Agente de Laser Inova</h3>
      </div>

      {/* Area de resultados/chat */}
      <div className="flex-1 p-4 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900/50">
        {!response && !loading && (
          <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center mt-10">
            Dime qué quieres hacer en lenguaje natural. <br/>
            Ej: "Crea un cliente llamado Carlos y una cotización de 100 termos a 200 pesos"
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {response && (
          <div className={`p-5 rounded-2xl border shadow-sm ${response.success ? 'bg-white dark:bg-zinc-900 border-emerald-100 dark:border-emerald-900/30' : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900 text-red-800 dark:text-red-200'}`}>
            <p className={`font-semibold text-lg mb-4 ${response.success ? 'text-zinc-800 dark:text-zinc-100' : ''}`}>
              {response.message}
            </p>
            
            {response.details && response.details.length > 0 && (
              <div className="space-y-4">
                {response.details.map((detail, idx) => {
                  const { accion, data } = detail;
                  
                  if (accion === "Cálculo Realizado") {
                    return (
                      <div key={idx} className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-indigo-500 rounded-lg text-white">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <h4 className="font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider text-xs">Cotización Rápida Estimada</h4>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div className="bg-white/60 dark:bg-black/20 p-3 rounded-lg">
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase">Área Total</p>
                            <p className="font-medium text-zinc-800 dark:text-zinc-200">{data.area_cm2} cm²</p>
                          </div>
                          <div className="bg-white/60 dark:bg-black/20 p-3 rounded-lg">
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase">Costo Material (con merma)</p>
                            <p className="font-medium text-zinc-800 dark:text-zinc-200">${data.materialCost?.toFixed(2)}</p>
                          </div>
                          <div className="bg-white/60 dark:bg-black/20 p-3 rounded-lg">
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase">Costo Producción</p>
                            <p className="font-medium text-zinc-800 dark:text-zinc-200">${data.productionCost?.toFixed(2)}</p>
                          </div>
                          <div className="bg-white/60 dark:bg-black/20 p-3 rounded-lg border border-red-200/50">
                            <p className="text-[10px] text-red-500 font-bold uppercase">Costo Real (Interno)</p>
                            <p className="font-bold text-red-700">${data.realCost?.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="bg-indigo-500 text-white p-3 rounded-lg shadow-md mb-2">
                          <p className="text-[10px] text-indigo-100 font-bold uppercase">Precio Sugerido Venta</p>
                          <p className="font-black text-2xl">${data.suggestedPrice?.toFixed(2)}</p>
                        </div>
                        <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70 italic">"{data.nota}"</p>
                      </div>
                    );
                  }

                  if (accion === "Cliente Creado") {
                    return (
                      <div key={idx} className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Cliente Registrado</p>
                          <p className="font-semibold text-zinc-800 dark:text-zinc-200">{data.name}</p>
                          {data.phone && <p className="text-sm text-zinc-500">{data.phone}</p>}
                        </div>
                        <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                          {data.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    );
                  }

                  if (accion === "Cotización Creada") {
                    return (
                      <div key={idx} className="bg-amber-50 dark:bg-amber-950/30 p-5 rounded-xl border border-amber-200 dark:border-amber-800/50">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-amber-500 rounded-lg text-white">
                            <FileText className="w-4 h-4" />
                          </div>
                          <h4 className="font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider text-xs">Cotización Generada</h4>
                        </div>
                        
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-medium text-zinc-800 dark:text-zinc-200">{data.project}</p>
                            <p className="text-sm font-mono text-amber-700 dark:text-amber-300 mt-1">{data.folio}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-amber-700/70 font-bold uppercase">Gran Total</p>
                            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">${data.total?.toFixed(2)}</p>
                          </div>
                        </div>

                        {data.concepts && data.concepts.length > 0 && (
                          <div className="mt-4 border-t border-amber-200/50 pt-4 space-y-2">
                            <p className="text-[10px] text-amber-700/70 font-bold uppercase mb-2">Conceptos Incluidos ({data.concepts.length})</p>
                            {data.concepts.map((c: any, i: number) => (
                              <div key={i} className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-2 rounded-lg text-sm">
                                <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate pr-4">{c.description}</span>
                                <span className="font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">${c.totalAmount?.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-lg text-sm font-mono">
                      <span className="font-bold">{accion}</span>: {JSON.stringify(data)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Escribe una instrucción..."
          disabled={loading}
          className="flex-1 bg-white text-black placeholder-gray-500 border border-gray-300 rounded-lg px-4 py-2 text-base shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button 
          type="submit" 
          disabled={loading || !prompt.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
