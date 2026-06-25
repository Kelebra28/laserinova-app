import { prisma } from "@/lib/prisma";
import { 
  DollarSign, 
  FileText, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  Package, 
  CheckSquare, 
  AlertCircle, 
  Download, 
  ArrowLeft,
  LayoutDashboard,
  Zap,
  Receipt
} from "lucide-react";
import Link from "next/link";
import KanbanBoard from "@/components/dashboard/KanbanBoard";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(currentYear, currentMonth + 1, 0);

  // Fetch all quotes for this month (Created or Updated)
  const quotesThisMonth = await prisma.quote.findMany({
    where: {
      active: true,
      OR: [
        { createdAt: { gte: startDate, lte: endDate } },
        { updatedAt: { gte: startDate, lte: endDate } }
      ]
    },
    include: {
      client: true
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  // Cuentas por Cobrar (GLOBAL)
  const allPendingQuotes = await prisma.quote.findMany({
    where: {
      active: true,
      paymentStatus: { in: ["PENDING", "PARTIAL"] },
      status: { notIn: ["CANCELLED", "REJECTED"] }
    }
  });

  const totalGlobalPending = allPendingQuotes.reduce((sum, q) => {
    const balance = q.total - (q.realAmountCollected || 0);
    return sum + (balance > 0 ? balance : 0);
  }, 0);

  // Categorize for Task Board (Kanban)
  const columns = [
    { id: "SENT", label: "Enviada", colorClass: "bg-blue-500", dotClass: "bg-blue-500", shadowClass: "shadow-[0_0_8px_rgba(59,130,246,0.5)]" },
    { id: "APPROVED", label: "Aprobada", colorClass: "bg-purple-500", dotClass: "bg-purple-500", shadowClass: "shadow-[0_0_8px_rgba(168,85,247,0.5)]" },
    { id: "IN_PRODUCTION", label: "En Proceso", colorClass: "bg-orange-500", dotClass: "bg-orange-500", shadowClass: "shadow-[0_0_8px_rgba(249,115,22,0.5)]" },
    { id: "DELIVERED", label: "Entregada", colorClass: "bg-emerald-500", dotClass: "bg-emerald-500", shadowClass: "shadow-[0_0_8px_rgba(16,185,129,0.5)]" },
    { id: "DRAFT", label: "Borrador", colorClass: "bg-gray-500", dotClass: "bg-gray-500", shadowClass: "shadow-[0_0_8px_rgba(107,114,128,0.5)]" },
    { id: "CANCELLED", label: "Cancelada / Rechazada", colorClass: "bg-red-500", dotClass: "bg-red-500", shadowClass: "shadow-[0_0_8px_rgba(239,68,68,0.5)]" },
  ];

  const activeQuotes = quotesThisMonth.filter(q => q.status !== "CANCELLED" && q.status !== "REJECTED");
  
  const salesWithAnticipo = activeQuotes.filter(q => 
    (q.realAmountCollected && q.realAmountCollected > 0) || 
    ["PARTIAL", "PAID"].includes(q.paymentStatus)
  );

  const totalAmountWithAnticipo = salesWithAnticipo.reduce((sum, q) => sum + q.total, 0);
  
  // Solo cotizaciones con anticipo o liquidación para los KPIs financieros
  const quotesPaidFilter = quotesThisMonth.filter(q =>
    ["PARTIAL", "PAID"].includes(q.paymentStatus) && (q.realAmountCollected || 0) > 0
  );

  // IVA por pagar: solo de cotizaciones con cobro real
  const totalTaxQuoted = quotesPaidFilter.reduce((sum, q) => {
    if (!q.taxable) return sum;
    const proportion = q.total > 0 ? (q.realAmountCollected || 0) / q.total : 0;
    return sum + (q.tax * proportion);
  }, 0);

  // IVA de ingresos ya cobrados del mes
  const totalTaxCollected = quotesPaidFilter.reduce((sum, q) => {
    if (!q.taxable) return sum;
    const collected = q.realAmountCollected || 0;
    const proportion = q.total > 0 ? collected / q.total : 0;
    return sum + Math.round(q.tax * proportion * 100) / 100;
  }, 0);

  // Gastos operativos — resiliente si la tabla FinancialTransaction aún no existe en DB
  let totalManualExpenses = 0;
  try {
    const opExpenses = await prisma.financialTransaction.findMany({
      where: { isDeleted: false, type: "GASTO_OPERATIVO", date: { gte: startDate, lte: endDate } }
    });
    totalManualExpenses = opExpenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);
  } catch {
    // Tabla pendiente de migración en DB
  }

  const configs = await prisma.costConfiguration.findMany();
  const configMap = new Map(configs.map(c => [c.key, c.value]));

  const totalOperationCost = totalManualExpenses;
  const totalUtilityReal = quotesPaidFilter.reduce((sum, q) => {
    const collected = q.realAmountCollected || 0;
    const proportion = q.total > 0 ? collected / q.total : 0;
    const netIncome = (q.subtotal || 0) * proportion;
    return sum + netIncome;
  }, 0) - totalOperationCost;


  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-1000">
      {/* Premium Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-600 rounded-xl text-white shadow-lg shadow-red-600/20">
               <LayoutDashboard className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Panel de <span className="text-red-600">Control</span></h1>
          </div>
          <p className="text-gray-500 font-medium ml-12 italic">Monitoreo de producción y seguimiento de ventas.</p>
        </div>
        
        <div className="flex items-center gap-3 ml-12 md:ml-0">
          <Link 
            href="/dashboard/quotes/new"
            className="group relative flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-xl hover:shadow-gray-900/20 active:scale-95"
          >
            <PlusIcon className="h-5 w-5 text-red-500 group-hover:rotate-90 transition-transform duration-300" />
            Nueva Cotización
          </Link>
        </div>
      </div>
      
      {/* Stats Grid - Redesigned for Maximum Impact */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Ventas Totales */}
        <div className="relative bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <DollarSign className="h-24 w-24" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Ventas Totales (C/IVA)</p>
          <h3 className="text-3xl font-black text-gray-900 leading-none mb-2">
            ${totalAmountWithAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </h3>
          <div className="flex items-center gap-2 mt-4 text-[10px] font-bold">
            <span className="px-2 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
               Por cobrar: ${totalGlobalPending.toLocaleString('es-MX')}
            </span>
          </div>
        </div>

        {/* IVA */}
        <div className="relative bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Receipt className="h-24 w-24" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">IVA por Pagar (Total)</p>
          <h3 className="text-3xl font-black text-orange-600 leading-none mb-2">
            ${totalTaxQuoted.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </h3>
          <div className="flex items-center gap-2 mt-4 text-[10px] font-bold">
            <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
               Cobrado: ${totalTaxCollected.toLocaleString('es-MX')}
            </span>
          </div>
        </div>

        {/* Gastos */}
        <div className="relative bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Package className="h-24 w-24" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Gastos Operativos</p>
          <h3 className="text-3xl font-black text-red-600 leading-none mb-2">
            -${totalOperationCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[9px] font-bold text-gray-400 uppercase mt-2">Materiales + Gastos Fijos</p>
        </div>

        {/* Utilidad Neta */}
        <div className={`relative p-6 rounded-[2.5rem] border shadow-2xl overflow-hidden group transition-all duration-500 ${totalUtilityReal >= 0 ? 'bg-gray-900 border-white/5 shadow-gray-900/20' : 'bg-red-600 border-white/10 shadow-red-600/20'}`}>
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity text-white">
            <TrendingUp className="h-24 w-24" />
          </div>
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Zap className={`h-3 w-3 ${totalUtilityReal >= 0 ? 'text-emerald-400 fill-emerald-400' : 'text-white fill-white'}`} />
            Utilidad Real (Neta)
          </p>
          <h3 className={`text-3xl font-black leading-none mb-2 ${totalUtilityReal >= 0 ? 'text-emerald-400' : 'text-white'}`}>
            ${totalUtilityReal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[9px] font-bold text-white/40 uppercase mt-2">Libre de Gastos e IVA</p>
        </div>
      </div>

      {/* Kanban Board Section - Enhanced Container */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
             <div className="p-1.5 bg-slate-100/80 rounded-lg text-slate-600">
                <Clock className="h-4 w-4" />
             </div>
             Flujo de Trabajo (Mes Actual)
           </h3>
           <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> 
                {quotesThisMonth.length} Cotizaciones
              </span>
           </div>
        </div>
        
        <div className="-mx-4 px-4 pb-8 overflow-x-auto hide-scrollbar">
          <KanbanBoard initialQuotes={quotesThisMonth} columns={columns} />
        </div>
      </div>
    </div>
  );
}

function PlusIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
