"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, LayoutGrid } from "lucide-react";
import QuoteRow from "@/components/quotes/QuoteRow";
import QuoteFilters from "@/components/quotes/QuoteFilters";
import QuotePagination from "@/components/quotes/QuotePagination";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import { 
  getQuotesList, 
  getActiveQuotesKanban, 
  getClientsForFilters 
} from "@/server/actions/quote.actions";
import { GlobalLoader } from "@/components/ui/GlobalLoader";
import { DashboardSkeleton } from "@/components/ui/Skeleton";

import { QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS } from "@/lib/constants";

const columns = [
  { id: "SENT", label: "Enviada", colorClass: "bg-blue-500", dotClass: "bg-blue-500", shadowClass: "shadow-[0_0_8px_rgba(59,130,246,0.5)]" },
  { id: "APPROVED", label: "Aprobada", colorClass: "bg-purple-500", dotClass: "bg-purple-500", shadowClass: "shadow-[0_0_8px_rgba(168,85,247,0.5)]" },
  { id: "IN_PRODUCTION", label: "En Proceso", colorClass: "bg-orange-500", dotClass: "bg-orange-500", shadowClass: "shadow-[0_0_8px_rgba(249,115,22,0.5)]" },
  { id: "DELIVERED", label: "Entregada", colorClass: "bg-emerald-500", dotClass: "bg-emerald-500", shadowClass: "shadow-[0_0_8px_rgba(16,185,129,0.5)]" },
  { id: "DRAFT", label: "Borrador", colorClass: "bg-gray-500", dotClass: "bg-gray-500", shadowClass: "shadow-[0_0_8px_rgba(107,114,128,0.5)]" },
  { id: "CANCELLED", label: "Cancelada / Rechazada", colorClass: "bg-red-500", dotClass: "bg-red-500", shadowClass: "shadow-[0_0_8px_rgba(239,68,68,0.5)]" },
];

export default function QuotesClient() {
  const searchParams = useSearchParams();
  
  const search = searchParams.get("search") || "";
  const month = searchParams.get("month") || "all";
  const clientId = searchParams.get("clientId") || "all";
  const status = searchParams.get("status") || "all";
  const page = searchParams.get("page") || "1";
  const limit = searchParams.get("limit") || "10";

  // Query para la lista principal (re-fetch cuando cambia la URL)
  const { data: listData, isLoading: isLoadingList } = useQuery({
    queryKey: ["quotesList", search, month, clientId, status, page, limit],
    queryFn: async () => {
      const res = await getQuotesList({ search, month, clientId, status, page, limit });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 5000,
  });

  // Query para el Kanban (no depende de los filtros de la lista)
  const { data: kanbanData, isLoading: isLoadingKanban } = useQuery({
    queryKey: ["quotesKanban"],
    queryFn: async () => {
      const res = await getActiveQuotesKanban();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 5000,
  });

  // Query para los clientes (solo para el dropdown)
  const { data: clientsData } = useQuery({
    queryKey: ["clientsFilter"],
    queryFn: async () => {
      const res = await getClientsForFilters();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 60000, // Los clientes cambian menos frecuente
  });

  if (isLoadingList || isLoadingKanban) return <DashboardSkeleton />;

  const { quotes = [], totalItems = 0, totalPages = 1, currentPage = 1, itemsPerPage = 10, defaultMonth = "all" } = listData || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-red-600" />
            COTIZACIONES
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            Gestión de presupuestos y seguimiento de proyectos
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/quotes/quick"
            className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-200 shadow-sm text-[10px] font-black uppercase tracking-widest rounded-xl text-gray-600 bg-white hover:bg-gray-50 transition-all active:scale-95"
          >
            <FileText className="-ml-1 mr-2 h-4 w-4 text-gray-400" aria-hidden="true" />
            Cotización Libre
          </Link>
          <Link
            href="/dashboard/quotes/new"
            className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-600/20 text-white bg-red-600 hover:bg-red-700 transition-all active:scale-95"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
            Nueva Cotización
          </Link>
        </div>
      </div>

      {/* Kanban Board Section */}
      <div className="space-y-4">
         <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-2">
           Flujo de Trabajo (Activos y Recientes)
         </h3>
         <div className="-mx-4 px-4 pb-4 overflow-x-auto hide-scrollbar">
          {kanbanData && <KanbanBoard initialQuotes={kanbanData} columns={columns} />}
         </div>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <QuoteFilters clients={clientsData || []} defaultMonth={defaultMonth} />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto min-h-[400px] rounded-t-3xl">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Folio</th>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Proyecto</th>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Estatus</th>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Creado por</th>
                <th scope="col" className="relative px-6 py-4"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <FileText className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">No hay cotizaciones registradas</p>
                  </td>
                </tr>
              ) : (
                quotes.map((quote: any) => (
                  <QuoteRow 
                    key={quote.id} 
                    quote={quote} 
                    statusColors={QUOTE_STATUS_COLORS} 
                    statusLabels={QUOTE_STATUS_LABELS} 
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <QuotePagination 
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={itemsPerPage}
        />
      </div>
    </div>
  );
}
