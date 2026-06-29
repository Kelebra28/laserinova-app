"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface MonthlyData {
  month: string;
  revenue: number;
  profit: number;
}

export default function InvoiceOverview({ 
  totalRevenue, 
  netProfit, 
  dateRange, 
  chartData 
}: { 
  totalRevenue: number, 
  netProfit: number, 
  dateRange: string, 
  chartData: MonthlyData[] 
}) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
      {/* Left Column: Stats */}
      <div className="md:w-1/3 flex flex-col justify-between space-y-8">
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-6">Resumen de Facturación</h3>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ventas Totales:</p>
          <h2 className="text-4xl font-black text-gray-900 leading-none">
            ${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-xs text-gray-400 mt-2 font-medium">{dateRange}</p>
          
          <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-bold">
            <TrendingUp className="h-3 w-3" />
            +16.3%
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-lg font-black text-gray-900">${netProfit.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Utilidad Neta</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <p className="text-lg font-black text-gray-900">${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ingresos</p>
          </div>
        </div>
      </div>

      {/* Right Column: Chart */}
      <div className="md:w-2/3 h-64">
        <div className="flex justify-end mb-4">
           <span className="text-xs font-semibold text-gray-400">Ordenar Por: Anual</span>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="profit" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
