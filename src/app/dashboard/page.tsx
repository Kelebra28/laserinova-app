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
import InvoiceOverview from "@/components/dashboard/InvoiceOverview";
import OrderStats from "@/components/dashboard/OrderStats";
import TopClients from "@/components/dashboard/TopClients";
import ProductTracking from "@/components/dashboard/ProductTracking";
import BestSellingMaterials from "@/components/dashboard/BestSellingMaterials";

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

  // Generate Chart Data (Gastos vs Ingresos Histórico - 6 meses)
  const last6Months = Array.from({length: 6}).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d;
  });

  let chartData = [];
  try {
    const chartDataPromises = last6Months.map(async (date) => {
      const m = date.getMonth();
      const y = date.getFullYear();
      const s = new Date(y, m, 1);
      const e = new Date(y, m + 1, 0, 23, 59, 59);

      const income = await prisma.financialTransaction.aggregate({
        where: { date: { gte: s, lte: e }, type: { in: ['INGRESO', 'ANTICIPO', 'LIQUIDACION'] }, isDeleted: false },
        _sum: { amount: true }
      });
      const expense = await prisma.financialTransaction.aggregate({
        where: { date: { gte: s, lte: e }, type: { in: ['GASTO_OPERATIVO', 'GASTO_PROYECTO'] }, isDeleted: false },
        _sum: { amount: true }
      });

      const rev = income._sum.amount || 0;
      const exp = expense._sum.amount || 0;

      return {
        month: date.toLocaleDateString('es-MX', { month: 'short' }),
        revenue: rev,
        profit: rev - exp
      };
    });
    chartData = await Promise.all(chartDataPromises);
  } catch (err) {
    // Fallback if FinancialTransaction table is not yet populated
    chartData = last6Months.map(date => ({
      month: date.toLocaleDateString('es-MX', { month: 'short' }),
      revenue: 0,
      profit: 0
    }));
    // Override current month with quotes data if we don't have finance data
    if (chartData.length > 0) {
       chartData[chartData.length - 1].revenue = totalAmountWithAnticipo;
       chartData[chartData.length - 1].profit = totalUtilityReal;
    }
  }

  // Order Stats (Cotizaciones con mis estatus)
  const draftCount = quotesThisMonth.filter(q => q.status === 'DRAFT').length;
  const sentCount = quotesThisMonth.filter(q => q.status === 'SENT').length;
  const approvedCount = quotesThisMonth.filter(q => q.status === 'APPROVED').length;
  const inProdCount = quotesThisMonth.filter(q => q.status === 'IN_PRODUCTION').length;
  const deliveredCount = quotesThisMonth.filter(q => q.status === 'DELIVERED').length;
  const cancelledCount = quotesThisMonth.filter(q => ['CANCELLED', 'REJECTED'].includes(q.status)).length;
  
  const orderStatsData = [
    { name: 'Borrador', value: draftCount, color: '#94a3b8', percentageChange: '0%', isPositive: true },
    { name: 'Enviadas', value: sentCount, color: '#3b82f6', percentageChange: '0%', isPositive: true },
    { name: 'Aprobadas', value: approvedCount, color: '#a855f7', percentageChange: '0%', isPositive: true },
    { name: 'En Producción', value: inProdCount, color: '#f97316', percentageChange: '0%', isPositive: true },
    { name: 'Entregadas', value: deliveredCount, color: '#10b981', percentageChange: '0%', isPositive: true },
    { name: 'Canceladas', value: cancelledCount, color: '#ef4444', percentageChange: '0%', isPositive: false },
  ].filter(s => s.value > 0);

  // Top Clients
  const clientRevenue: Record<string, { revenue: number, name: string }> = {};
  quotesThisMonth.forEach(q => {
    if (q.client) {
      if (!clientRevenue[q.client.id]) clientRevenue[q.client.id] = { revenue: 0, name: q.client.name || q.client.company || 'Cliente' };
      clientRevenue[q.client.id].revenue += q.total;
    }
  });
  
  const topClientsData = Object.values(clientRevenue)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4)
    .map((c, idx) => ({
      name: c.name,
      industry: 'Cotizaciones Recientes',
      sales: 0,
      revenue: c.revenue,
      growth: '-',
      iconBg: ['bg-blue-100', 'bg-sky-100', 'bg-emerald-100', 'bg-purple-100'][idx % 4],
      iconColor: ['text-blue-600', 'text-sky-600', 'text-emerald-600', 'text-purple-600'][idx % 4],
      initial: c.name.charAt(0).toUpperCase()
    }));

  if (topClientsData.length === 0) {
     topClientsData.push({ name: 'Sin clientes', industry: '-', sales: 0, revenue: 0, growth: '-', iconBg: 'bg-gray-100', iconColor: 'text-gray-400', initial: '-' });
  }

  // Tracking Items (Mis Tareas)
  const latestTasks = await prisma.task.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });

  const trackingItems = latestTasks.map((t) => {
    let type: "PENDING" | "DELIVERED" | "RECEIVED" | "PAYMENT" = 'PENDING';
    if (t.status === 'DONE') type = 'DELIVERED';
    else if (t.status === 'IN_PROGRESS') type = 'RECEIVED';
    else if (t.status === 'BLOCKED') type = 'PAYMENT'; // Just to use a different color
    
    return {
      id: t.id,
      title: t.title,
      status: t.status === 'DONE' ? 'Completada' : t.status === 'IN_PROGRESS' ? 'En Progreso' : t.status === 'BLOCKED' ? 'Bloqueada' : 'Pendiente',
      time: new Date(t.updatedAt).toLocaleDateString('es-MX'),
      date: new Date(t.createdAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
      type
    };
  });

  if (trackingItems.length === 0) {
    trackingItems.push({ id: '1', title: 'Sin tareas', status: '-', time: '-', date: '-', type: 'PENDING' });
  }

  // Best Selling Products (Mejores Servicios/Materiales)
  const allConcepts = await prisma.quoteConcept.findMany({
    where: { quoteId: { in: quotesThisMonth.map(q => q.id) } },
    include: { material: true }
  });

  const materialCounts: Record<string, { count: number, name: string, category: string, price: number }> = {};
  allConcepts.forEach(c => {
    if (c.material) {
      if (!materialCounts[c.material.id]) {
        materialCounts[c.material.id] = { count: 0, name: c.material.name, category: "Material", price: c.finalUnitPrice };
      }
      materialCounts[c.material.id].count += c.quantity;
    }
  });

  const bestSellingProducts = Object.values(materialCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((m, idx) => ({
      name: m.name,
      category: m.category,
      price: m.price,
      rating: 5,
      imageColor: ['bg-amber-800', 'bg-sky-400', 'bg-emerald-500', 'bg-purple-500'][idx % 4]
    }));
    
  if (bestSellingProducts.length === 0) {
     bestSellingProducts.push({ name: 'Sin datos', category: '-', price: 0, rating: 0, imageColor: 'bg-gray-200' });
  }


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

      {/* Main Dashboard Content Layout */}
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="xl:w-2/3 flex flex-col gap-6">
          <InvoiceOverview 
            totalRevenue={totalAmountWithAnticipo} 
            netProfit={totalUtilityReal} 
            dateRange="Ene 20, 2026 a Jul, 2026"
            chartData={chartData}
          />
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/2">
               <TopClients clients={topClientsData} />
            </div>
            <div className="lg:w-1/2">
               <ProductTracking items={trackingItems} />
            </div>
          </div>
        </div>
        <div className="xl:w-1/3 flex flex-col gap-6">
          <OrderStats data={orderStatsData} />
          <BestSellingMaterials products={bestSellingProducts} />
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
