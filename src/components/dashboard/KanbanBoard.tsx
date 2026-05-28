"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Package, CheckSquare } from "lucide-react";
import { updateQuoteStatusAction } from "@/app/dashboard/quotes/actions";

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  CALCULATED: "Calculada",
  SENT: "Enviada",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  IN_PRODUCTION: "Producción",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
};

const paymentLabels: Record<string, string> = {
  PENDING: "Por cobrar",
  PARTIAL: "Adelanto",
  PAID: "Pagado",
};

export default function KanbanBoard({ 
  initialQuotes, 
  columns 
}: { 
  initialQuotes: any[], 
  columns: any[] 
}) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [isPending, startTransition] = useTransition();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const onDragStart = (e: React.DragEvent, quoteId: string) => {
    // Forzamos al navegador a capturar TODA la tarjeta como imagen de arrastre
    if (e.currentTarget instanceof HTMLElement) {
      // Ajustamos el punto de agarre al centro superior para que se sienta natural
      e.dataTransfer.setDragImage(e.currentTarget, 150, 40);
    }
    
    e.dataTransfer.setData("quoteId", quoteId);
    
    // Timeout para ocultar la original DESPUÉS de que el navegador tomó la foto
    setTimeout(() => {
      setDraggingId(quoteId);
    }, 0);
  };



  const onDragEnd = (e: React.DragEvent) => {
    setDraggingId(null);
    setDragOverCol(null);
    e.currentTarget.classList.remove('opacity-50');
  };

  const onDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    if (dragOverCol !== statusId) {
      setDragOverCol(statusId);
    }
  };

  const onDragLeave = () => {
    setDragOverCol(null);
  };

  const onDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const quoteId = e.dataTransfer.getData("quoteId");
    setDraggingId(null);
    setDragOverCol(null);
    
    if (!quoteId) return;

    // Optimistic Update
    const updatedQuotes = quotes.map(q => 
      q.id === quoteId ? { ...q, status: newStatus } : q
    );
    setQuotes(updatedQuotes);

    startTransition(async () => {
      await updateQuoteStatusAction(quoteId, newStatus);
    });
  };

  const getQuotesByStatus = (statusId: string) => {
    if (statusId === "CANCELLED") {
      return quotes.filter(q => q.status === "CANCELLED" || q.status === "REJECTED");
    }
    return quotes.filter(q => q.status === statusId);
  };

  return (
    <div className="pb-4 overflow-x-auto">
      <div className="flex gap-6 pb-6 min-w-max px-2">
        {columns.map(col => {
          const columnQuotes = getQuotesByStatus(col.id);
          const getDropZoneColor = (statusId: string) => {
            switch(statusId) {
              case 'DRAFT': return 'bg-gray-100 border-gray-200';
              case 'SENT': return 'bg-blue-50 border-blue-200';
              case 'APPROVED': return 'bg-purple-50 border-purple-200';
              case 'IN_PRODUCTION': return 'bg-orange-50 border-orange-200';
              case 'DELIVERED': return 'bg-emerald-50 border-emerald-200';
              case 'CANCELLED': return 'bg-red-50 border-red-200';
              default: return 'bg-gray-50 border-gray-100';
            }
          };

          return (
            <div 
              key={col.id} 
              onDragOver={(e) => onDragOver(e, col.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, col.id)}
              className={`flex flex-col h-full rounded-[2rem] p-4 border transition-all duration-200 w-[300px] shrink-0 ${
                dragOverCol === col.id 
                  ? `${getDropZoneColor(col.id)} shadow-inner scale-[1.01]` 
                  : 'bg-gray-50/30 border-gray-100/50'
              }`}
            >

              <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.dotClass} ${col.shadowClass}`}></div>
                  <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">{col.label}</h2>
                </div>
                <span className="text-[10px] font-black bg-white border border-gray-100 text-gray-500 px-2.5 py-1 rounded-xl shadow-sm">
                  {columnQuotes.length}
                </span>
              </div>
              <div className="space-y-4 flex-1 overflow-y-auto max-h-[520px] pr-1.5 scrollbar-thin">
                {columnQuotes.map(quote => {
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
                      {/* Placeholder cuando se arrastra */}
                      {isDragging && (
                        <div className={`absolute inset-0 border-2 border-dashed rounded-2xl animate-pulse ${
                          col.id === 'CANCELLED' ? 'border-red-200 bg-red-50/20' : 
                          col.id === 'DELIVERED' ? 'border-emerald-200 bg-emerald-50/20' :
                          col.id === 'IN_PRODUCTION' ? 'border-orange-200 bg-orange-50/20' :
                          col.id === 'APPROVED' ? 'border-purple-200 bg-purple-50/20' :
                          'border-blue-200 bg-blue-50/20'
                        }`}></div>
                      )}


                      <TaskCard quote={quote} />
                    </div>
                  );
                })}

                {columnQuotes.length === 0 && <EmptyState label="Arrastra aquí" />}
              </div>
            </div>
          );

        })}
      </div>
    </div>
  );
}

function TaskCard({ quote }: { quote: any }) {
  const remaining = quote.total - (quote.realAmountCollected || 0);

  return (
    <Link 
      href={`/dashboard/quotes/${quote.id}`}
      className="block bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all group"
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-[9px] font-black text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{quote.folio}</span>
        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{new Date(quote.createdAt).toLocaleDateString('es-MX')}</span>
      </div>

      
      <h4 className="text-sm font-black text-gray-900 group-hover:text-gray-600 transition-colors truncate mb-1 leading-tight">{quote.project}</h4>

      <p className="text-[11px] font-medium text-gray-400 truncate mb-4">{quote.client?.name || "Sin cliente asignado"}</p>
      
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="text-[8px] font-black px-2 py-0.5 rounded bg-gray-50 text-gray-400 uppercase tracking-tighter">
          {statusLabels[quote.status]}
        </span>
        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
          quote.paymentStatus === "PAID" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
        }`}>
          {paymentLabels[quote.paymentStatus || "PENDING"]}
        </span>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <div>
          <span className="block text-[8px] font-black text-gray-300 uppercase tracking-widest">Total</span>
          <span className="text-sm font-black text-gray-900">${quote.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        {quote.paymentStatus === "PAID" && (
          <CheckSquare className="h-4 w-4 text-emerald-500" />
        )}
      </div>
    </Link>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 bg-white/40 rounded-3xl border-2 border-dashed border-gray-100">
      <div className="p-3 bg-gray-50 rounded-full mb-3">
        <Package className="h-6 w-6 text-gray-200" />
      </div>
      <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">{label}</span>
    </div>
  );
}
