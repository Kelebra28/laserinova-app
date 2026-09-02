import { prisma } from "@/lib/prisma";

export async function getDashboardStatsService() {
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
    chartData = last6Months.map(date => ({
      month: date.toLocaleDateString('es-MX', { month: 'short' }),
      revenue: 0,
      profit: 0
    }));
    if (chartData.length > 0) {
       chartData[chartData.length - 1].revenue = totalAmountWithAnticipo;
       chartData[chartData.length - 1].profit = totalUtilityReal;
    }
  }

  const chartTotalRevenue = chartData.reduce((sum, data) => sum + data.revenue, 0);
  const chartTotalProfit = chartData.reduce((sum, data) => sum + data.profit, 0);
  const chartDateRange = `${last6Months[0].toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })} a ${last6Months[5].toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}`;

  // Order Stats
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

  // Tracking Items
  const latestTasks = await prisma.task.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });

  const trackingItems = latestTasks.map((t) => {
    let type: "PENDING" | "DELIVERED" | "RECEIVED" | "PAYMENT" = 'PENDING';
    if (t.status === 'DONE') type = 'DELIVERED';
    else if (t.status === 'IN_PROGRESS') type = 'RECEIVED';
    else if (t.status === 'BLOCKED') type = 'PAYMENT';
    
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

  // Best Selling Products
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

  return {
    totalAmountWithAnticipo,
    totalGlobalPending,
    totalTaxQuoted,
    totalTaxCollected,
    totalOperationCost,
    totalUtilityReal,
    chartTotalRevenue,
    chartTotalProfit,
    chartDateRange,
    chartData,
    orderStatsData,
    topClientsData,
    trackingItems,
    bestSellingProducts
  };
}
