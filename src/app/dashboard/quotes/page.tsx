import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, FileText, LayoutGrid } from "lucide-react";
import QuoteRow from "@/components/quotes/QuoteRow";
import QuoteFilters from "@/components/quotes/QuoteFilters";
import QuotePagination from "@/components/quotes/QuotePagination";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import { Prisma } from "@prisma/client";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  CALCULATED: "bg-blue-100 text-blue-800",
  SENT: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  IN_PRODUCTION: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-teal-100 text-teal-800",
  CANCELLED: "bg-gray-200 text-gray-600",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  CALCULATED: "Calculada",
  SENT: "Enviada",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  IN_PRODUCTION: "En Producción",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
};

export const dynamic = 'force-dynamic';

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    search?: string, 
    month?: string, 
    clientId?: string, 
    status?: string,
    page?: string,
    limit?: string
  }>;
}) {
  const { search, month, clientId, status, page, limit } = await searchParams;

  const clients = await prisma.client.findMany({
    select: { id: true, name: true, company: true },
    orderBy: { name: 'asc' }
  });

  const now = new Date();
  const defaultMonth = "all";
  const targetMonth = month !== undefined ? month : defaultMonth;
  
  let dateFilter = {};
  if (targetMonth && targetMonth !== "all") {
    const [year, m] = targetMonth.split("-").map(Number);
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0, 23, 59, 59, 999);
    
    dateFilter = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };
  }

  const whereClause: Prisma.QuoteWhereInput = {
    ...(search ? {
      OR: [
        { folio: { contains: search } },
        { client: { name: { contains: search } } },
        { client: { company: { contains: search } } },
        { project: { contains: search } },
      ]
    } : {}),
    ...(clientId && clientId !== "all" ? { clientId } : {}),
    ...(status && status !== "all" ? { status: status as any } : {}),
    ...dateFilter
  };

  const currentPage = Math.max(1, parseInt(page || "1", 10));
  const itemsPerPage = Math.max(1, parseInt(limit || "10", 10));
  const skip = (currentPage - 1) * itemsPerPage;

  const [totalItems, quotes] = await Promise.all([
    prisma.quote.count({ where: whereClause }),
    prisma.quote.findMany({
      where: whereClause,
      include: {
        client: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: itemsPerPage,
    })
  ]);

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(currentYear, currentMonth + 1, 0);

  const activeQuotes = await prisma.quote.findMany({
    where: {
      active: true,
      OR: [
        { createdAt: { gte: startDate, lte: endDate } },
        { updatedAt: { gte: startDate, lte: endDate } },
        { status: { notIn: ["DELIVERED", "CANCELLED", "REJECTED"] } }
      ]
    },
    include: {
      client: true
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  const columns = [
    { id: "SENT", label: "Enviada", colorClass: "bg-blue-500", dotClass: "bg-blue-500", shadowClass: "shadow-[0_0_8px_rgba(59,130,246,0.5)]" },
    { id: "APPROVED", label: "Aprobada", colorClass: "bg-purple-500", dotClass: "bg-purple-500", shadowClass: "shadow-[0_0_8px_rgba(168,85,247,0.5)]" },
    { id: "IN_PRODUCTION", label: "En Proceso", colorClass: "bg-orange-500", dotClass: "bg-orange-500", shadowClass: "shadow-[0_0_8px_rgba(249,115,22,0.5)]" },
    { id: "DELIVERED", label: "Entregada", colorClass: "bg-emerald-500", dotClass: "bg-emerald-500", shadowClass: "shadow-[0_0_8px_rgba(16,185,129,0.5)]" },
    { id: "DRAFT", label: "Borrador", colorClass: "bg-gray-500", dotClass: "bg-gray-500", shadowClass: "shadow-[0_0_8px_rgba(107,114,128,0.5)]" },
    { id: "CANCELLED", label: "Cancelada / Rechazada", colorClass: "bg-red-500", dotClass: "bg-red-500", shadowClass: "shadow-[0_0_8px_rgba(239,68,68,0.5)]" },
  ];

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

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
          <KanbanBoard initialQuotes={activeQuotes} columns={columns} />
         </div>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <QuoteFilters clients={clients} defaultMonth={defaultMonth} />
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
                quotes.map((quote) => (
                  <QuoteRow 
                    key={quote.id} 
                    quote={quote} 
                    statusColors={statusColors} 
                    statusLabels={statusLabels} 
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
