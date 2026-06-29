"use client";

import { CheckCircle2, Clock, Truck, Package, CreditCard } from "lucide-react";

interface TrackingItem {
  id: string;
  title: string;
  status: string;
  time: string;
  date: string;
  type: "PENDING" | "DELIVERED" | "RECEIVED" | "PAYMENT";
}

export default function ProductTracking({ items }: { items: TrackingItem[] }) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'PENDING': return <Clock className="h-4 w-4 text-white" />;
      case 'DELIVERED': return <CheckCircle2 className="h-4 w-4 text-white" />;
      case 'RECEIVED': return <Package className="h-4 w-4 text-white" />;
      case 'PAYMENT': return <CreditCard className="h-4 w-4 text-white" />;
      default: return <Truck className="h-4 w-4 text-white" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'PENDING': return 'bg-indigo-500';
      case 'DELIVERED': return 'bg-emerald-500';
      case 'RECEIVED': return 'bg-purple-500';
      case 'PAYMENT': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold text-gray-800">Seguimiento de Proyectos</h3>
          <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer">Ver Todos</span>
        </div>

        <div className="relative pl-3 space-y-6 mb-6">
          <div className="absolute left-[1.15rem] top-2 bottom-2 w-0.5 bg-gray-100" />
          
          {items.map((item, i) => (
            <div key={i} className="relative flex items-start gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10 shadow-sm ${getBgColor(item.type)}`}>
                {getIcon(item.type)}
              </div>
              <div className="flex-1 pt-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">{item.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-900">{item.date}</p>
                    <p className="text-[10px] font-semibold text-gray-400 mt-0.5">{item.time}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-20 w-full rounded-b-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-50/50 to-transparent" />
        <svg viewBox="0 0 400 100" className="absolute bottom-0 w-full h-full text-indigo-200 fill-current opacity-30 preserve-3d" preserveAspectRatio="none">
          <path d="M0,50 C100,100 200,0 400,50 L400,100 L0,100 Z" />
        </svg>
        <svg viewBox="0 0 400 100" className="absolute bottom-0 w-full h-full text-indigo-500 fill-transparent stroke-current stroke-[3px]" preserveAspectRatio="none">
          <path d="M0,50 C100,100 200,0 400,50" />
        </svg>
      </div>
    </div>
  );
}
