import { prisma } from "@/lib/prisma";
import { FileText, TrendingUp, DollarSign, Download, CheckCircle, ArrowLeft, Calendar, Users, Package, Settings, FileSpreadsheet } from "lucide-react";
import Link from "next/link";

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

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  CALCULATED: "bg-blue-100 text-blue-600",
  SENT: "bg-purple-100 text-purple-600",
  APPROVED: "bg-green-100 text-green-600",
  REJECTED: "bg-red-100 text-red-600",
  IN_PRODUCTION: "bg-orange-100 text-orange-600",
  DELIVERED: "bg-teal-100 text-teal-600",
  CANCELLED: "bg-black text-white",
};

export const dynamic = 'force-dynamic';

export default async function ReportsPage(props: { searchParams: Promise<{ month?: string; year?: string; tab?: string }> }) {
  const searchParams = await props.searchParams;
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const selectedYear = parseInt(searchParams.year || currentYear.toString());
  const selectedMonth = parseInt(searchParams.month || currentMonth.toString());
  const selectedTab = searchParams.tab || 'finanzas';

  // Rango de fechas
  const startDate = new Date(selectedYear, selectedMonth - 1, 1);
  const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);

  const quotes = await prisma.quote.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      client: true,
      user: true,
      concepts: {
        include: {
          material: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const activeQuotes = quotes.filter(q => q.status !== "CANCELLED" && q.status !== "REJECTED");
  const totalAmount = activeQuotes.reduce((acc, q) => acc + q.total, 0);
  const totalUtility = activeQuotes.reduce((acc, q) => acc + (q.realUtilityTotal || 0), 0);
  const totalCollected = quotes.reduce((acc, q) => acc + (q.realAmountCollected || 0), 0);

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const stats = [
    { 
      name: "Cotizaciones", 
      value: quotes.length.toString(),
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    { 
      name: "Total Cotizado", 
      value: `$${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-gray-600",
      bgColor: "bg-gray-50"
    },
    { 
      name: "Cobrado Real", 
      value: `$${totalCollected.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
    { 
      name: "Utilidad Real", 
      value: `$${totalUtility.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
  ];

  // AGREGACIONES PARA OTRAS PESTAÑAS
  
  // 1. Clientes
  const clientsStats = Array.from(quotes.reduce((acc, q) => {
    const cId = q.clientId || `prospect_${q.prospectName || 'unknown'}`;
    if (!acc.has(cId)) acc.set(cId, { name: q.client?.name || q.prospectName || 'Sin Cliente', count: 0, total: 0, utility: 0 });
    const entry = acc.get(cId);
    entry.count += 1;
    if(q.status !== "CANCELLED" && q.status !== "REJECTED") {
      entry.total += q.total;
      entry.utility += (q.realUtilityTotal || 0);
    }
    return acc;
  }, new Map()).values()).sort((a: any, b: any) => b.total - a.total);

  // 2. Inventario/Productos
  const productsStats = Array.from(activeQuotes.reduce((acc, q) => {
    q.concepts.forEach((c: any) => {
      if(c.conceptType === "PRODUCTO" || c.conceptType === "RESALE") {
        const pName = c.description || 'Producto sin nombre';
        if (!acc.has(pName)) acc.set(pName, { name: pName, type: c.conceptType, quantity: 0, revenue: 0, cost: 0 });
        const entry = acc.get(pName);
        entry.quantity += c.quantity;
        entry.revenue += ((c.finalUnitPrice || 0) * c.quantity);
        entry.cost += ((c.realCost || 0));
      }
    });
    return acc;
  }, new Map()).values()).sort((a: any, b: any) => b.revenue - a.revenue);

  // 3. Procesos (Servicios prestados)
  const processesStats = Array.from(activeQuotes.reduce((acc, q) => {
    q.concepts.forEach((c: any) => {
      if(c.conceptType !== "PRODUCTO" && c.conceptType !== "RESALE") {
        const type = c.conceptType;
        if (!acc.has(type)) acc.set(type, { name: type, quantity: 0, revenue: 0, cost: 0, utility: 0 });
        const entry = acc.get(type);
        entry.quantity += c.quantity;
        entry.revenue += ((c.finalUnitPrice || 0) * c.quantity);
        entry.cost += (c.realCost || 0);
        entry.utility += (((c.finalUnitPrice || 0) * c.quantity) - (c.realCost || 0));
      }
    });
    return acc;
  }, new Map()).values()).sort((a: any, b: any) => b.revenue - a.revenue);


  const tabs = [
    { id: 'finanzas', name: 'Resumen Financiero', icon: DollarSign },
    { id: 'clientes', name: 'Rendimiento por Cliente', icon: Users },
    { id: 'inventario', name: 'Productos Vendidos', icon: Package },
    { id: 'procesos', name: 'Servicios y Procesos', icon: Settings },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Centro de Reportes</h1>
          <p className="text-sm text-gray-500 font-medium">Análisis detallado de tu negocio en todas las dimensiones</p>
        </div>
        
        {/* Filtros Premium */}
        <form className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          <input type="hidden" name="tab" value={selectedTab} />
          <div className="flex items-center gap-2 px-3 border-r border-gray-100 mr-1">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Periodo</span>
          </div>
          <select 
            name="month" 
            defaultValue={selectedMonth}
            className="text-xs font-black p-2 bg-gray-50 border border-transparent rounded-lg outline-none focus:ring-2 focus:ring-red-500 cursor-pointer transition-all"
          >
            {months.map((m, i) => (
              <option key={i+1} value={i+1}>{m}</option>
            ))}
          </select>
          <select 
            name="year" 
            defaultValue={selectedYear}
            className="text-xs font-black p-2 bg-gray-50 border border-transparent rounded-lg outline-none focus:ring-2 focus:ring-red-500 cursor-pointer transition-all"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button 
            type="submit"
            className="px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg text-white bg-gray-900 hover:bg-black transition-all active:scale-95 shadow-lg"
          >
            Actualizar
          </button>
        </form>
      </div>

      {/* Stats Grid Global */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.name}</p>
                <p className="text-lg font-black text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TABS NAVIGATION */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const isCurrent = selectedTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/dashboard/reports?month=${selectedMonth}&year=${selectedYear}&tab=${tab.id}`}
                className={`
                  whitespace-nowrap flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isCurrent
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                aria-current={isCurrent ? 'page' : undefined}
              >
                <tab.icon className={`mr-2 h-5 w-5 ${isCurrent ? 'text-red-500' : 'text-gray-400'}`} />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* TAB CONTENT */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {selectedTab === 'finanzas' && <DollarSign className="h-5 w-5 text-red-600" />}
            {selectedTab === 'clientes' && <Users className="h-5 w-5 text-red-600" />}
            {selectedTab === 'inventario' && <Package className="h-5 w-5 text-red-600" />}
            {selectedTab === 'procesos' && <Settings className="h-5 w-5 text-red-600" />}
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">
              Reporte de {tabs.find(t => t.id === selectedTab)?.name} ({months[selectedMonth - 1]} {selectedYear})
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <a
              href={`/api/reports/excel?month=${selectedMonth}&year=${selectedYear}&tab=${selectedTab}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-100 transition-all active:scale-95 border border-emerald-200 shadow-sm"
            >
              <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
              Descargar Excel
            </a>
            
            <a
              href={`/api/reports/monthly/pdf?month=${selectedMonth}&year=${selectedYear}&tab=${selectedTab}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-all active:scale-95 border border-gray-200 shadow-sm"
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Descargar PDF
            </a>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            {selectedTab === 'finanzas' && (
              <>
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Folio</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Fecha</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Cliente</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Estatus</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Total</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Utilidad Real</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          href={`/dashboard/quotes/${quote.id}`} 
                          className="inline-flex items-center text-[11px] font-black text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded-lg transition-colors border border-red-100/50"
                        >
                          {quote.folio}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[11px] font-bold text-gray-400">
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-[11px] font-black text-gray-900">{quote.client?.name || "Sin cliente"}</p>
                        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tighter truncate max-w-[150px]">{quote.project}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md tracking-tighter shadow-sm border ${statusColors[quote.status]}`}>
                          {statusLabels[quote.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-[11px] font-black text-gray-900 font-mono">
                        ${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right text-[11px] font-black font-mono ${
                        (quote.realUtilityTotal || 0) < 0 ? "text-red-500" : "text-emerald-500"
                      }`}>
                        ${(quote.realUtilityTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link 
                          href={`/dashboard/quotes/${quote.id}`}
                          className="p-2 text-gray-300 hover:text-red-600 transition-colors inline-block"
                        >
                          <ArrowLeft className="h-4 w-4 rotate-180" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {quotes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm font-bold text-gray-400">No hay datos en este periodo</td>
                    </tr>
                  )}
                </tbody>
              </>
            )}

            {selectedTab === 'clientes' && (
              <>
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Cliente / Prospecto</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Total Cotizaciones</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Ingreso Aprobado</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Utilidad Neta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clientsStats.map((client: any, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-[12px] font-black text-gray-900">{client.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-[12px] font-bold text-gray-600">{client.count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-[12px] font-black text-gray-900 font-mono">
                        ${client.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right text-[12px] font-black font-mono ${
                        client.utility < 0 ? "text-red-500" : "text-emerald-500"
                      }`}>
                        ${client.utility.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {clientsStats.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-sm font-bold text-gray-400">No hay datos en este periodo</td></tr>
                  )}
                </tbody>
              </>
            )}

            {selectedTab === 'inventario' && (
              <>
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Producto / Material</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Tipo</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Cantidad Vendida</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Ventas Generadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {productsStats.map((prod: any, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-[12px] font-black text-gray-900 truncate max-w-sm" title={prod.name}>{prod.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-[10px] font-bold text-gray-500">{prod.type === 'RESALE' ? 'Reventa' : 'Producto Propio'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-[12px] font-bold text-gray-600">{prod.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-[12px] font-black text-gray-900 font-mono">
                        ${prod.revenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {productsStats.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-sm font-bold text-gray-400">No hay datos en este periodo</td></tr>
                  )}
                </tbody>
              </>
            )}

            {selectedTab === 'procesos' && (
              <>
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Servicio</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Veces Contratado</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Ventas Generadas</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Utilidad Generada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {processesStats.map((proc: any, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-[12px] font-black text-gray-900">
                        <span className={`px-2 py-1 rounded text-white text-[10px] ${
                          proc.name === "CORTE" ? "bg-red-600" :
                          proc.name === "GRABADO" ? "bg-orange-600" :
                          proc.name === "IMPRESION" ? "bg-blue-600" :
                          proc.name === "SERVICIO_SITIO" ? "bg-violet-600" : "bg-gray-600"
                        }`}>
                          {proc.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-[12px] font-bold text-gray-600">{proc.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-[12px] font-black text-gray-900 font-mono">
                        ${proc.revenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right text-[12px] font-black font-mono ${
                        proc.utility < 0 ? "text-red-500" : "text-emerald-500"
                      }`}>
                        ${proc.utility.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {processesStats.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-sm font-bold text-gray-400">No hay datos en este periodo</td></tr>
                  )}
                </tbody>
              </>
            )}

          </table>
        </div>
      </div>
    </div>
  );
}
