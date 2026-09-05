"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/server/actions/dashboard.actions";
import { GlobalLoader } from "@/components/ui/GlobalLoader";
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  Receipt,
  LayoutDashboard,
  Zap,
} from "lucide-react";
import Link from "next/link";
import InvoiceOverview from "@/components/dashboard/InvoiceOverview";
import OrderStats from "@/components/dashboard/OrderStats";
import TopClients from "@/components/dashboard/TopClients";
import ProductTracking from "@/components/dashboard/ProductTracking";
import BestSellingMaterials from "@/components/dashboard/BestSellingMaterials";
import { AgentChat } from "@/components/agent/AgentChat";
import { Card, CardContent } from "@/components/ui/Card";
import { DashboardSkeleton } from "@/components/ui/Skeleton";

export default function DashboardClient() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const res = await getDashboardStats();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  });

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <div className="p-8 text-red-500">Error cargando dashboard: {error.message}</div>;
  if (!data) return null;

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
            ${data.totalAmountWithAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </h3>
          <div className="flex items-center gap-2 mt-4 text-[10px] font-bold">
            <span className="px-2 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
               Por cobrar: ${data.totalGlobalPending.toLocaleString('es-MX')}
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
            ${data.totalTaxQuoted.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </h3>
          <div className="flex items-center gap-2 mt-4 text-[10px] font-bold">
            <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
               Cobrado: ${data.totalTaxCollected.toLocaleString('es-MX')}
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
            -${data.totalOperationCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[9px] font-bold text-gray-400 uppercase mt-2">Materiales + Gastos Fijos</p>
        </div>

        {/* Utilidad Neta */}
        <div className={`relative p-6 rounded-[2.5rem] border shadow-2xl overflow-hidden group transition-all duration-500 ${data.totalUtilityReal >= 0 ? 'bg-gray-900 border-white/5 shadow-gray-900/20' : 'bg-red-600 border-white/10 shadow-red-600/20'}`}>
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity text-white">
            <TrendingUp className="h-24 w-24" />
          </div>
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Zap className={`h-3 w-3 ${data.totalUtilityReal >= 0 ? 'text-emerald-400 fill-emerald-400' : 'text-white fill-white'}`} />
            Utilidad Real (Neta)
          </p>
          <h3 className={`text-3xl font-black leading-none mb-2 ${data.totalUtilityReal >= 0 ? 'text-emerald-400' : 'text-white'}`}>
            ${data.totalUtilityReal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[9px] font-bold text-white/40 uppercase mt-2">Libre de Gastos e IVA</p>
        </div>
      </div>

      {/* Main Dashboard Content Layout */}
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="xl:w-2/3 flex flex-col gap-6">
          <InvoiceOverview 
            totalRevenue={data.chartTotalRevenue} 
            netProfit={data.chartTotalProfit} 
            dateRange={data.chartDateRange}
            chartData={data.chartData}
          />
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/2">
               <TopClients clients={data.topClientsData} />
            </div>
            <div className="lg:w-1/2">
               <ProductTracking items={data.trackingItems} />
            </div>
          </div>
        </div>
        <div className="xl:w-1/3 flex flex-col gap-6">
          <AgentChat />
          <OrderStats data={data.orderStatsData} />
          <BestSellingMaterials products={data.bestSellingProducts} />
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
