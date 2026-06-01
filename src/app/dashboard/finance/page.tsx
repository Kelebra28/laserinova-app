import { prisma } from "@/lib/prisma";
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar,
  ArrowDownRight, Receipt, Wallet, Package, Activity,
  BarChart3, Briefcase, Scale, ArrowRight
} from "lucide-react";
import Link from "next/link";
import TransactionForm from "@/components/finance/TransactionForm";
import TransactionTable from "@/components/finance/TransactionTable";
import PaymentBoard from "@/components/finance/PaymentBoard";
import { HistoryFilter } from "@/components/finance/HistoryFilter";

// Prevent static prerender — data is always live
export const dynamic = 'force-dynamic';

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const resolvedParams = await searchParams;
  const now = new Date();
  const currentMonth = resolvedParams.month ? parseInt(resolvedParams.month, 10) : now.getMonth();
  const currentYear = resolvedParams.year ? parseInt(resolvedParams.year, 10) : now.getFullYear();

  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate   = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

  // ── FinancialTransaction KPIs ────────────────────────────
  const transactions = await prisma.financialTransaction.findMany({
    where: {
      isDeleted: false,
      date: { gte: startDate, lte: endDate },
    },
    include: {
      quote:     { select: { folio: true, project: true } },
      client:    { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  // ── Ingresos desde Cotizaciones
  // Solo cotizaciones que YA tienen un cobro real (adelanto o liquidación)
  const paidQuotesThisMonth = await prisma.quote.findMany({
    where: {
      active: true,
      updatedAt: { gte: startDate, lte: endDate },
      realAmountCollected: { gt: 0 },
      paymentStatus: { in: ["PARTIAL", "PAID"] }, // ← solo si hay anticipo o liquidación
    },
  });

  const quoteIncome    = paidQuotesThisMonth.reduce((s, q) => s + (q.realAmountCollected || 0), 0);
  const quoteIVA       = paidQuotesThisMonth.reduce((s, q) => {
    if (!q.taxable) return s;
    const proportion = q.total > 0 ? (q.realAmountCollected || 0) / q.total : 0;
    return s + (q.tax * proportion);
  }, 0);
  const quoteProjectCosts = paidQuotesThisMonth.reduce((s, q) => {
    const proportion = q.total > 0 ? (q.realAmountCollected || 0) / q.total : 0;
    return s + ((q.realCostTotal || 0) * proportion);
  }, 0);

  // ── KPIs combinados: Cotizaciones + Transacciones manuales
  const INCOME_TYPES = ["INGRESO", "ANTICIPO", "LIQUIDACION"];
  const txIncome        = transactions.filter(t => INCOME_TYPES.includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const txOpExpenses    = transactions.filter(t => t.type === "GASTO_OPERATIVO").reduce((s, t) => s + t.amount, 0);
  const txProjectCosts  = transactions.filter(t => t.type === "GASTO_PROYECTO").reduce((s, t) => s + t.amount, 0);
  const txTaxCollected  = transactions.filter(t => INCOME_TYPES.includes(t.type)).reduce((s, t) => s + (t.taxAmount || 0), 0);

  // Totales finales
  // Nota: quoteProjectCosts (costo estimado de producción) NO se suma a los gastos reales.
  // Solo los GASTO_PROYECTO manuales son gastos reales del proyecto.
  const totalIncome       = quoteIncome + txIncome;
  const totalOpExpenses   = txOpExpenses;
  const totalProjectCosts = txProjectCosts;           // solo gastos reales manuales
  const totalTaxCollected = quoteIVA + txTaxCollected;
  const grossProfit       = totalIncome - totalProjectCosts;
  const netProfit         = grossProfit - totalOpExpenses;

  // ── Cobranza (quotes) ────────────────────────────────────
  const allPendingQuotes = await prisma.quote.findMany({
    where: { active: true, status: { notIn: ["CANCELLED", "REJECTED", "DRAFT"] } },
    include: { client: true },
  });
  const fullyPaidQuotes = allPendingQuotes.filter(
    q => (q.total - (q.realAmountCollected || 0)) <= 0.01 && (q.realAmountCollected || 0) > 0
  );

  // ── For forms ────────────────────────────────────────────
  const quotes  = await prisma.quote.findMany({
    where: { active: true, status: { notIn: ["CANCELLED", "REJECTED"] } },
    select: { id: true, folio: true, project: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const clients = await prisma.client.findMany({
    where: { active: true },
    select: { id: true, name: true, company: true },
    orderBy: { name: "asc" },
  });

  const monthName = startDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  // ── Combined Transactions for Table ───────────────────────
  const virtualTransactions = paidQuotesThisMonth.map(q => ({
    id: `virtual-${q.id}`,
    type: "INGRESO",
    category: "Cobro de Proyecto",
    amount: q.realAmountCollected || 0,
    taxAmount: q.taxable ? (q.total > 0 ? (q.realAmountCollected || 0) * (q.tax / q.total) : 0) : 0,
    description: `Pago registrado: ${q.project}`,
    date: q.updatedAt,
    status: "ACTIVO",
    isVirtual: true,
    quote: { folio: q.folio, project: q.project },
    client: null,
  }));

  const combinedTransactions = [...transactions, ...virtualTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-8 max-w-7xl pb-20 animate-in fade-in duration-500">
      
      {/* ── Premium Header ─────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gray-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-gray-900/20 border border-white/5">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-red-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px]" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-red-400 mb-2">
              <Activity className="h-3 w-3" />
              Estado Financiero — {monthName}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none uppercase">
              Panel de <span className="text-red-500">Control</span>
            </h1>
            <p className="text-white/40 font-medium text-sm max-w-md">
              Contabilidad operativa real. Cada número tiene origen trazable.
            </p>
          </div>

          <div className="flex flex-col items-end gap-4">
            <HistoryFilter basePath="/dashboard/finance" currentMonth={currentMonth} currentYear={currentYear} variant="dark" />
            <div className="text-right mt-2">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Utilidad Neta del Mes</p>
              <p className={`text-4xl md:text-5xl font-black ${netProfit >= 0 ? "text-white" : "text-red-500"}`}>
                ${netProfit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                href="/dashboard/finance/history" 
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-black transition-all border border-white/5"
              >
                <BarChart3 className="w-4 h-4" />
                Reportes / Historial
              </Link>
              <TransactionForm quotes={quotes} clients={clients} />
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Ingresos Cobrados */}
        <div className="xl:col-span-2 group relative bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
          <div className="absolute top-4 right-4 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors">
            <TrendingUp className="h-10 w-10" />
          </div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Ingresos Cobrados
          </p>
          <p className="text-2xl font-black text-gray-900">
            ${totalIncome.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-bold text-gray-400 mt-1">Anticipos + Liquidaciones + Ingresos</p>
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
            <p className="text-[9px] font-black text-gray-400 uppercase">IVA cobrado</p>
            <p className="text-xs font-black text-blue-600">${totalTaxCollected.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Gastos Operativos */}
        <div className="xl:col-span-2 group relative bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
          <div className="absolute top-4 right-4 text-red-500/10 group-hover:text-red-500/20 transition-colors">
            <TrendingDown className="h-10 w-10" />
          </div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Gastos Operativos
          </p>
          <p className="text-2xl font-black text-red-600">
            -${totalOpExpenses.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-bold text-gray-400 mt-1">Gastos generales del negocio</p>
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
            <p className="text-[9px] font-black text-gray-400 uppercase">Costos de proyectos</p>
            <p className="text-xs font-black text-orange-600">-${totalProjectCosts.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[9px] font-black text-gray-400 uppercase">Total gastos</p>
            <p className="text-xs font-black text-red-700">-${(totalOpExpenses + totalProjectCosts).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Utilidad Bruta */}
        <div className={`xl:col-span-2 p-6 rounded-[2rem] border shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden group ${
          grossProfit >= 0 ? "bg-gray-900 border-white/5" : "bg-red-600 border-white/10"
        }`}>
          <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full animate-pulse ${grossProfit >= 0 ? "bg-emerald-400" : "bg-white"}`} />
            Utilidad Bruta
          </p>
          <p className={`text-2xl font-black ${grossProfit >= 0 ? "text-emerald-400" : "text-white"}`}>
            ${grossProfit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-bold text-white/30 mt-1">Ingresos − Costos de proyectos</p>
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-[9px] font-black text-white/30 uppercase">Margen bruto</p>
            <p className={`text-xs font-black ${grossProfit >= 0 ? "text-emerald-400" : "text-white"}`}>
              {totalIncome > 0 ? ((grossProfit / totalIncome) * 100).toFixed(1) : "0.0"}%
            </p>
          </div>
        </div>
      </div>

      {/* ── Secondary KPIs ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-xl"><Receipt className="h-4 w-4 text-blue-600" /></div>
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">IVA por Pagar</p>
          </div>
          <p className="text-2xl font-black text-blue-700">
            ${totalTaxCollected.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-bold text-blue-400 mt-1">IVA de ingresos cobrados (16%)</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-50 rounded-xl"><Briefcase className="h-4 w-4 text-orange-500" /></div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Proyectos Activos</p>
          </div>
          <p className="text-2xl font-black text-gray-900">{allPendingQuotes.length}</p>
          <p className="text-[9px] font-bold text-gray-400 mt-1">Cotizaciones en seguimiento</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gray-100 rounded-xl"><Scale className="h-4 w-4 text-gray-600" /></div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Utilidad Neta</p>
          </div>
          <p className={`text-2xl font-black ${netProfit >= 0 ? "text-gray-900" : "text-red-600"}`}>
            ${netProfit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-bold text-gray-400 mt-1">Bruta − Gastos operativos</p>
        </div>
      </div>

      {/* ── Cobranza Board ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-3">
            <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600"><Calendar className="h-4 w-4" /></div>
            Tablero de Seguimiento de Cobros
          </h3>
          <div className="text-[10px] font-black text-gray-400 uppercase bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
            {allPendingQuotes.length} Proyectos activos
          </div>
        </div>
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-2">
          <PaymentBoard initialQuotes={allPendingQuotes} initialPaidQuotes={fullyPaidQuotes} />
        </div>
      </div>

      {/* ── Movements Table ────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-3">
            <div className="p-1.5 bg-red-100 rounded-lg text-red-600"><ArrowDownRight className="h-4 w-4" /></div>
            Movimientos del Mes
          </h3>
          <div className="text-[10px] font-black text-gray-400 uppercase bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
            {combinedTransactions.length} registros
          </div>
        </div>
        <TransactionTable 
          transactions={combinedTransactions as any} 
          quotes={quotes} 
          clients={clients} 
        />
      </div>

    </div>
  );
}
