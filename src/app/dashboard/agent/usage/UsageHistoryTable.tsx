'use client';

import { useState } from 'react';

export default function UsageHistoryTable({ logs, EXCHANGE_RATE_MXN }: { logs: any[], EXCHANGE_RATE_MXN: number }) {
  const [agentFilter, setAgentFilter] = useState<string | null>(null);

  const filteredLogs = agentFilter 
    ? logs.filter(log => log.agentName === agentFilter)
    : logs;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Historial de Peticiones</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setAgentFilter(null)}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${!agentFilter ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setAgentFilter('Secretary')}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${agentFilter === 'Secretary' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
          >
            Secretary
          </button>
          <button 
            onClick={() => setAgentFilter('El Chalán')}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${agentFilter === 'El Chalán' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
          >
            El Chalán
          </button>
        </div>
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
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-gray-400 font-medium">No hay registros para este filtro.</td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 text-xs font-medium text-gray-600">
                    {new Date(log.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
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
  );
}
