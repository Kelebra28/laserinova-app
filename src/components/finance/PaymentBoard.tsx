"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { DollarSign, Loader2 } from "lucide-react";
import { updateQuotePaymentAction } from "@/app/dashboard/quotes/actions";

export default function PaymentBoard({ 
  initialQuotes,
  initialPaidQuotes
}: { 
  initialQuotes: any[],
  initialPaidQuotes: any[]
}) {
  const [allPending, setAllPending] = useState(initialQuotes);
  const [paidThisMonth, setPaidThisMonth] = useState(initialPaidQuotes);
  const [isPending, startTransition] = useTransition();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const onDragStart = (e: React.DragEvent, quoteId: string) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 150, 40);
    }
    e.dataTransfer.setData("quoteId", quoteId);
    setTimeout(() => {
      setDraggingId(quoteId);
    }, 0);
  };


  const onDragEnd = () => {
    setDraggingId(null);
    setDragOverCol(null);
  };

  const onDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const onDragLeave = () => {
    setDragOverCol(null);
  };

  const onDrop = async (e: React.DragEvent, type: 'unpaid' | 'partial' | 'paid') => {
    e.preventDefault();
    const quoteId = e.dataTransfer.getData("quoteId");
    setDraggingId(null);
    setDragOverCol(null);
    
    if (!quoteId) return;

    // Find the quote in either list
    const quote = allPending.find(q => q.id === quoteId) || paidThisMonth.find(q => q.id === quoteId);
    if (!quote) return;

    // Optimistic Update
    if (type === 'paid') {
      setAllPending(prev => prev.filter(q => q.id !== quoteId));
      setPaidThisMonth(prev => {
        if (prev.find(q => q.id === quoteId)) return prev;
        return [...prev, { ...quote, realAmountCollected: quote.total, paymentStatus: 'PAID' }];
      });
    } else {
      setPaidThisMonth(prev => prev.filter(q => q.id !== quoteId));
      setAllPending(prev => {
        const other = prev.filter(q => q.id !== quoteId);
        const newStatus = type === 'unpaid' ? 'PENDING' : 'PARTIAL';
        
        // Si la regresamos de "Pagada" a "Abono", bajamos el monto al 50%
        let newCollected = quote.realAmountCollected;
        if (type === 'unpaid') {
          newCollected = 0;
        } else if (type === 'partial' && (quote.realAmountCollected || 0) >= (quote.total - 0.01)) {
          newCollected = quote.total / 2;
        }
        
        return [...other, { ...quote, realAmountCollected: newCollected, paymentStatus: newStatus }];
      });
    }


    startTransition(async () => {
      await updateQuotePaymentAction(quoteId, type);
    });
  };

  const unpaid = allPending.filter(q => (q.realAmountCollected || 0) === 0);
  const partial = allPending.filter(q => {
    const collected = q.realAmountCollected || 0;
    const remaining = q.total - collected;
    return collected > 0 && remaining > 0.01;
  });


  return (
    <div className="relative">
      {isPending && (
        <div className="absolute inset-0 z-50 bg-white/40 backdrop-blur-[1px] flex items-center justify-center rounded-3xl">
          <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-red-600 animate-spin" />
            <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Sincronizando...</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Column: Por Cobrar */}
      <div 
        onDragOver={(e) => onDragOver(e, 'unpaid')}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, 'unpaid')}
        className={`flex flex-col rounded-3xl p-4 border min-h-[400px] transition-all duration-200 ${
          dragOverCol === 'unpaid' 
            ? 'bg-blue-50 border-blue-200 shadow-inner scale-[1.01]' 
            : 'bg-gray-50/50 border-gray-100'
        }`}
      >
        <div className="flex items-center justify-between mb-4 px-2">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Pendientes (0%)</span>
          <span className="text-[10px] font-black bg-white px-2 py-1 rounded-lg shadow-sm border border-gray-100 text-gray-500">{unpaid.length}</span>
        </div>
        <div className="space-y-3 overflow-y-auto max-h-[360px] 2xl:max-h-[500px] pr-1.5 scrollbar-thin">
          {unpaid.map(quote => {
            const isDragging = draggingId === quote.id;
            return (
              <div 
                key={quote.id} 
                draggable 
                onDragStart={(e) => onDragStart(e, quote.id)} 
                onDragEnd={onDragEnd}
                className={`relative cursor-grab active:cursor-grabbing transition-all duration-200 ${
                  isDragging ? 'opacity-0 scale-95' : 'hover:scale-[1.02] opacity-100'
                }`}
              >
                {isDragging && (
                  <div className={`absolute inset-0 border-2 border-dashed rounded-2xl animate-pulse border-blue-200 bg-blue-50/20`}></div>
                )}

                <PaymentCard quote={quote} type="unpaid" />
              </div>
            );
          })}
          {unpaid.length === 0 && <EmptyPaymentState label="Sin cuentas al 0%" />}
        </div>
      </div>


      {/* Column: Con Anticipo */}
      <div 
        onDragOver={(e) => onDragOver(e, 'partial')}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, 'partial')}
        className={`flex flex-col rounded-3xl p-4 border min-h-[400px] transition-all duration-200 ${
          dragOverCol === 'partial' 
            ? 'bg-orange-50 border-orange-200 shadow-inner scale-[1.01]' 
            : 'bg-gray-50/50 border-gray-100'
        }`}
      >
        <div className="flex items-center justify-between mb-4 px-2">
          <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">En Abono (Anticipos)</span>
          <span className="text-[10px] font-black bg-white px-2 py-1 rounded-lg shadow-sm border border-gray-100 text-gray-500">{partial.length}</span>
        </div>
        <div className="space-y-3 overflow-y-auto max-h-[360px] 2xl:max-h-[500px] pr-1.5 scrollbar-thin">
          {partial.map(quote => {
            const isDragging = draggingId === quote.id;
            return (
              <div 
                key={quote.id} 
                draggable 
                onDragStart={(e) => onDragStart(e, quote.id)} 
                onDragEnd={onDragEnd}
                className={`relative cursor-grab active:cursor-grabbing transition-all duration-200 ${
                  isDragging ? 'opacity-0 scale-95' : 'hover:scale-[1.02] opacity-100'
                }`}
              >
                {isDragging && <div className="absolute inset-0 border-2 border-dashed border-orange-200 rounded-2xl bg-orange-50/20 animate-pulse"></div>}
                <PaymentCard quote={quote} type="partial" />
              </div>
            );
          })}
          {partial.length === 0 && <EmptyPaymentState label="Sin abonos activos" />}
        </div>
      </div>

      {/* Column: Liquidadas */}
      <div 
        onDragOver={(e) => onDragOver(e, 'paid')}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, 'paid')}
        className={`flex flex-col rounded-3xl p-4 border min-h-[400px] transition-all duration-200 ${
          dragOverCol === 'paid' 
            ? 'bg-emerald-50 border-emerald-200 shadow-inner scale-[1.01]' 
            : 'bg-gray-50/50 border-gray-100'
        }`}
      >
        <div className="flex items-center justify-between mb-4 px-2">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Liquidadas (Mes)</span>
          <span className="text-[10px] font-black bg-white px-2 py-1 rounded-lg shadow-sm border border-gray-100 text-gray-500">{paidThisMonth.length}</span>
        </div>
        <div className="space-y-3 overflow-y-auto max-h-[360px] 2xl:max-h-[500px] pr-1.5 scrollbar-thin">
          {paidThisMonth.map(quote => {
            const isDragging = draggingId === quote.id;
            return (
              <div 
                key={quote.id} 
                draggable 
                onDragStart={(e) => onDragStart(e, quote.id)} 
                onDragEnd={onDragEnd}
                className={`relative cursor-grab active:cursor-grabbing transition-all duration-200 ${
                  isDragging ? 'opacity-0 scale-95' : 'hover:scale-[1.02] opacity-100'
                }`}
              >
                {isDragging && <div className="absolute inset-0 border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/20 animate-pulse"></div>}
                <PaymentCard quote={quote} type="paid" />
              </div>
            );
          })}
          {paidThisMonth.length === 0 && <EmptyPaymentState label="Sin cobros liquidados" />}
        </div>
      </div>
    </div>
  </div>
);


}

function PaymentCard({ quote, type }: { quote: any, type: 'unpaid' | 'partial' | 'paid' }) {
  const balance = quote.total - (quote.realAmountCollected || 0);
  const collected = quote.realAmountCollected || 0;

  return (
    <Link 
      href={`/dashboard/quotes/${quote.id}`}
      className="block bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-[11px] font-black text-gray-900 group-hover:text-gray-600 transition-colors truncate max-w-[150px]">{quote.project}</p>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{quote.folio}</p>
        </div>
        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
          type === 'paid' ? 'bg-emerald-50 text-emerald-600' : 
          type === 'partial' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
        }`}>
          {type === 'paid' ? 'Liquidada' : type === 'partial' ? 'Abono' : 'Pendiente'}
        </span>
      </div>


      <div className="flex items-end justify-between mt-4">
        <div>
          <span className="block text-[8px] font-black text-gray-300 uppercase tracking-widest">Pagado</span>
          <span className="text-xs font-black text-emerald-600">${collected.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
        {balance > 0 && (
          <div className="text-right">
            <span className="block text-[8px] font-black text-red-300 uppercase tracking-widest">Faltan</span>
            <span className="text-xs font-black text-red-600">-${balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function EmptyPaymentState({ label }: { label: string }) {
  return (
    <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl">
      <DollarSign className="h-5 w-5 text-gray-100 mb-2" />
      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{label}</span>
    </div>
  );
}
