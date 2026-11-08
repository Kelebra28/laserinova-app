"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import MenuSelect from "@/components/ui/MenuSelect";
import Link from "next/link";
import { Package, CheckSquare } from "lucide-react";
import { updateQuoteStatusAction } from "@/server/actions/quote.actions";

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
  columns,
  onChanged,
}: { 
  initialQuotes: any[], 
  columns: any[],
  onChanged?: () => void,
}) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [pendingMove, setPendingMove] = useState<{ quoteId: string; newStatus: string } | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  // Mantener el tablero sincronizado cuando llegan datos nuevos del servidor
  const [syncedFrom, setSyncedFrom] = useState(initialQuotes);
  if (syncedFrom !== initialQuotes) {
    setSyncedFrom(initialQuotes);
    setQuotes(initialQuotes);
  }
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
    await requestMove(quoteId, newStatus);
  };

  const requestMove = async (quoteId: string, newStatus: string) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    const current = quote.status === "REJECTED" ? "CANCELLED" : quote.status;
    if (current === newStatus) return;

    // Estas transiciones descuentan inventario la primera vez: pedir confirmación
    if (["APPROVED", "IN_PRODUCTION", "DELIVERED"].includes(newStatus) && !quote.stockDeducted) {
      setPendingMove({ quoteId, newStatus });
      return;
    }
    await moveQuote(quoteId, newStatus);
  };

  const moveQuote = async (quoteId: string, newStatus: string) => {
    const previous = quotes;
    // Optimistic update con rollback si el servidor falla
    setQuotes(quotes.map(q => (q.id === quoteId ? { ...q, status: newStatus } : q)));
    try {
      await updateQuoteStatusAction(quoteId, newStatus);
      onChanged?.();
    } catch (err: any) {
      setQuotes(previous);
      toast.error(err?.message || "No se pudo cambiar el estatus");
    }
  };

  const confirmMove = async () => {
    if (!pendingMove) return;
    setIsMoving(true);
    await moveQuote(pendingMove.quoteId, pendingMove.newStatus);
    setIsMoving(false);
    setPendingMove(null);
  };

  const getQuotesByStatus = (statusId: string) => {
    if (statusId === "CANCELLED") {
      return quotes.filter(q => q.status === "CANCELLED" || q.status === "REJECTED");
    }
    return quotes.filter(q => q.status === statusId);
  };

  const pendingLabel = columns.find(c => c.id === pendingMove?.newStatus)?.label;

  return (
    <div className="pb-4 overflow-x-auto">
      <ConfirmationModal
        isOpen={!!pendingMove}
        onClose={() => setPendingMove(null)}
        onConfirm={confirmMove}
        isLoading={isMoving}
        variant="warning"
        title="Mover cotización"
        message={`Al pasar a "${pendingLabel}" se descontará del inventario el stock de los productos de esta cotización. ¿Continuar?`}
        confirmText="Sí, mover"
        cancelText="Cancelar"
      />
      <div className="flex gap-6 pb-6 min-w-max px-2">
        {columns.map(col => {
          const columnQuotes = getQuotesByStatus(col.id);
          const getDropZoneColor = (statusId: string) => {
            switch(statusId) {
              case 'DRAFT': return 'bg-gray-100 border-gray-200';
              case 'CALCULATED': return 'bg-cyan-50 border-cyan-200';
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
              className={`flex flex-col h-full rounded-2xl p-4 transition-all duration-200 w-[300px] shrink-0 ${
                dragOverCol === col.id 
                  ? `${getDropZoneColor(col.id)} shadow-inner scale-[1.01]` 
                  : 'bg-slate-50 border border-slate-200/60'
              }`}
            >

              <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.dotClass} ${col.shadowClass}`}></div>
                  <h2 className="text-xs font-bold text-slate-700 tracking-wider uppercase">{col.label}</h2>
                </div>
                <span className="text-[10px] font-bold bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full shadow-sm">
                  {columnQuotes.length}
                </span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[540px] pr-1.5 scrollbar-thin">
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
                        <div className={`absolute inset-0 border-2 border-dashed rounded-xl animate-pulse ${
                          col.id === 'CANCELLED' ? 'border-red-200 bg-red-50/50' : 
                          col.id === 'DELIVERED' ? 'border-emerald-200 bg-emerald-50/50' :
                          col.id === 'IN_PRODUCTION' ? 'border-orange-200 bg-orange-50/50' :
                          col.id === 'APPROVED' ? 'border-purple-200 bg-purple-50/50' :
                          'border-blue-200 bg-blue-50/50'
                        }`}></div>
                      )}


                      <TaskCard quote={quote} columns={columns} onMove={requestMove} />
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

function TaskCard({ quote, columns, onMove }: { quote: any; columns: any[]; onMove: (id: string, status: string) => void }) {

  return (
    <Link 
      href={`/dashboard/quotes/${quote.id}`}
      className="block bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md uppercase tracking-wide">{quote.folio}</span>
        <span className="text-[10px] font-medium text-slate-400">{new Date(quote.createdAt).toLocaleDateString('es-MX')}</span>
      </div>

      
      <h4 className="text-sm font-bold text-slate-800 group-hover:text-red-600 transition-colors truncate mb-1 leading-tight">{quote.project}</h4>

      <p className="text-xs text-slate-500 truncate mb-4">{quote.client?.name || "Sin cliente asignado"}</p>
      
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
          {statusLabels[quote.status]}
        </span>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
          quote.paymentStatus === "PAID" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
        }`}>
          {paymentLabels[quote.paymentStatus || "PENDING"]}
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
        <div>
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
          <span className="text-sm font-black text-slate-900">${quote.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex items-center gap-2">
          {quote.paymentStatus === "PAID" && <CheckSquare className="h-4 w-4 text-emerald-500" />}
          {/* Alternativa al arrastre: funciona con teclado y en pantallas táctiles */}
          <MenuSelect
            ariaLabel={`Mover ${quote.folio} a otro estatus`}
            value={quote.status === "REJECTED" ? "CANCELLED" : quote.status}
            options={columns.map((c) => ({ value: c.id, label: c.label.split(" / ")[0], dot: c.dotClass }))}
            onChange={(v) => onMove(quote.id, v)}
          />
        </div>
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
