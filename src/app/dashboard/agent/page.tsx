import { AgentChat } from "@/components/agent/AgentChat";
import { Sparkles, Bot, Zap, Database } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function AgentDashboardPage() {
  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-1000 max-w-6xl mx-auto">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-blue-900 to-indigo-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-900/20 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute -right-20 -top-20 opacity-10 blur-2xl">
          <Bot className="w-96 h-96" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl shadow-inner border border-white/20">
               <Sparkles className="h-6 w-6 text-blue-300" />
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight">
              Agente <span className="text-blue-400">Inteligente</span>
            </h1>
          </div>
          <p className="text-blue-100/80 font-medium ml-16 text-lg">
            Tu chalán virtual conectado directamente a la base de datos del CRM.
          </p>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: El Chat */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-4 shadow-xl border border-zinc-100 dark:border-zinc-800">
            {/* Reusamos el componente pero aquí tiene mucho más espacio para brillar */}
            <AgentChat />
          </div>
        </div>

        {/* Columna Derecha: Tips y Capacidades */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-xl border border-zinc-100 dark:border-zinc-800">
            <h3 className="font-black text-xl mb-6 text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> 
              ¿Qué puede hacer?
            </h3>
            
            <ul className="space-y-6">
              <li className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  1
                </div>
                <div>
                  <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Cotización Rápida</p>
                  <p className="text-xs text-zinc-500 mt-1">"¿Cuánto es de un mdf de 6mm de 50x50 con 10 min de láser?"</p>
                </div>
              </li>
              
              <li className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  2
                </div>
                <div>
                  <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Crear Clientes</p>
                  <p className="text-xs text-zinc-500 mt-1">"Registra a Juan Pérez con el teléfono 5512345678"</p>
                </div>
              </li>

              <li className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  3
                </div>
                <div>
                  <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Generar Órdenes</p>
                  <p className="text-xs text-zinc-500 mt-1">"Crea una cotización para Juan de 50 termos a 300 pesos"</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-black p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
            <Database className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
            <h3 className="font-black text-lg mb-2 text-white">100% Conectado</h3>
            <p className="text-sm text-zinc-400 font-medium">
              El agente lee los precios en tiempo real de tu base de datos (Materiales y CostConfiguration). No inventa precios, solo hace la matemática por ti.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
