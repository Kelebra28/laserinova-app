"use client";

import { TrendingUp, ArrowUpRight } from "lucide-react";

interface ClientStat {
  name: string;
  industry: string;
  sales: number;
  revenue: number;
  growth: string;
  iconBg: string;
  iconColor: string;
  initial: string;
}

export default function TopClients({ clients }: { clients: ClientStat[] }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-gray-800">Mejores Clientes</h3>
        <span className="text-xs font-semibold text-gray-400">Mensual</span>
      </div>

      <div className="space-y-5">
        {clients.map((client, i) => (
          <div key={i} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${client.iconBg} ${client.iconColor}`}>
                {client.initial}
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">{client.name}</h4>
                <p className="text-[10px] font-semibold text-gray-400">{client.industry}</p>
              </div>
            </div>
            
            <div className="text-right">
              <h4 className="text-sm font-black text-gray-900">${client.revenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h4>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-500">{client.growth}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
