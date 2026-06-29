"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface OrderStat {
  name: string;
  value: number;
  color: string;
  percentageChange: string;
  isPositive: boolean;
}

export default function OrderStats({ data }: { data: OrderStat[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-gray-800">Estadísticas de Cotizaciones</h3>
        <span className="text-xs font-semibold text-gray-400">Mensual</span>
      </div>

      <div className="flex-1 min-h-[200px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs font-bold text-gray-600">{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-gray-900">{item.value.toLocaleString()}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center justify-center w-10 ${
                item.isPositive ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'
              }`}>
                {item.isPositive ? '+' : ''}{item.percentageChange}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
