import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, Activity, Coins, BrainCircuit } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AiUsagePage() {
  await requireAuth();

  // Aggregate stats
  const aggregate = await prisma.aiUsageLog.aggregate({
    _sum: {
      totalTokens: true,
      estimatedCost: true,
      inputTokens: true,
      outputTokens: true,
    }
  });

  const totalCost = aggregate._sum.estimatedCost || 0;
  const totalTokens = aggregate._sum.totalTokens || 0;
  
  const EXCHANGE_RATE_MXN = 19.50; // Tipo de cambio aproximado
  const totalCostMXN = totalCost * EXCHANGE_RATE_MXN;
  
  // Get detailed logs
  const logs = await prisma.aiUsageLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      contact: true
    }
  });

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/agent" 
          className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-indigo-600" />
            USO DE INTELIGENCIA ARTIFICIAL
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            Métricas y consumo de tokens de Gemini API
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Costo Acumulado</h3>
          </div>
          <p className="text-3xl font-black text-gray-900 mt-2">
            ${totalCostMXN.toFixed(2)} <span className="text-sm text-gray-400 font-medium">MXN</span>
          </p>
          <p className="text-sm font-medium text-gray-400 mt-1">
            (${totalCost.toFixed(4)} USD)
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tokens Totales</h3>
          </div>
          <p className="text-3xl font-black text-gray-900 mt-2">{totalTokens.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tokens Entrada</h3>
          </div>
          <p className="text-3xl font-black text-gray-900 mt-2">{(aggregate._sum.inputTokens || 0).toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-fuchsia-100 text-fuchsia-600 rounded-xl">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tokens Salida</h3>
          </div>
          <p className="text-3xl font-black text-gray-900 mt-2">{(aggregate._sum.outputTokens || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Historial de Peticiones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Agente</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contacto (WhatsApp)</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Entrada</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Salida</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Costo (USD / MXN)</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-gray-400 font-medium">No hay registros de uso de IA todavía.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-xs font-medium text-gray-600">
                      {log.createdAt.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="p-4 text-xs font-bold text-indigo-600">
                      {log.agentName}
                    </td>
                    <td className="p-4 text-xs font-medium text-gray-600">
                      {log.contact?.name || log.contact?.phone || '-'}
                    </td>
                    <td className="p-4 text-xs text-right text-gray-500">
                      {log.inputTokens.toLocaleString()}
                    </td>
                    <td className="p-4 text-xs text-right text-gray-500">
                      {log.outputTokens.toLocaleString()}
                    </td>
                    <td className="p-4 text-xs text-right font-bold text-gray-700">
                      {log.totalTokens.toLocaleString()}
                    </td>
                    <td className="p-4 text-xs text-right font-bold text-emerald-600">
                      ${log.estimatedCost.toFixed(5)} USD<br/>
                      <span className="text-gray-400 font-medium">${(log.estimatedCost * EXCHANGE_RATE_MXN).toFixed(4)} MXN</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
