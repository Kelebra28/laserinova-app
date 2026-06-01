import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown, Receipt, Wallet, Scale, ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { HistoryFilter } from "@/components/finance/HistoryFilter";
import TransactionTable from "@/components/finance/TransactionTable";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Prevent static prerender
export const dynamic = 'force-dynamic';

export default async function FinanceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any;
  if (!currentUser) redirect("/login");

  const isAdmin = currentUser.role === "ADMIN";
  if (!isAdmin) redirect("/dashboard");

  const now = new Date();
  const resolvedParams = await searchParams;
  const currentMonth = resolvedParams.month ? parseInt(resolvedParams.month, 10) : now.getMonth();
  const currentYear = resolvedParams.year ? parseInt(resolvedParams.year, 10) : now.getFullYear();

  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

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

  const paidQuotesThisMonth = await prisma.quote.findMany({
    where: {
      active: true,
      closeDate: { gte: startDate, lte: endDate },
      realAmountCollected: { gt: 0 },
      paymentStatus: { in: ["PARTIAL", "PAID"] },
    },
  });

  // Cálculos de Ingresos
  const quoteIncome    = paidQuotesThisMonth.reduce((s, q) => s + (q.realAmountCollected || 0), 0);
  const quoteIVA       = paidQuotesThisMonth.reduce((s, q) => {
    if (!q.taxable) return s;
    const proportion = q.total > 0 ? (q.realAmountCollected || 0) / q.total : 0;
    return s + (q.tax * proportion);
  }, 0);

  const INCOME_TYPES = ["INGRESO", "ANTICIPO", "LIQUIDACION"];
  const EXPENSE_TYPES = ["GASTO_OPERATIVO", "GASTO_PROYECTO"];

  const txIncomeTotal       = transactions.filter(t => INCOME_TYPES.includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const txIncomeTaxTotal    = transactions.filter(t => INCOME_TYPES.includes(t.type)).reduce((s, t) => s + (t.taxAmount || 0), 0);

  const totalIncomeInclTax  = quoteIncome + txIncomeTotal;
  const totalTaxCollected   = quoteIVA + txIncomeTaxTotal;
  const totalIncomeSubtotal = totalIncomeInclTax - totalTaxCollected; // Lo libre de polvo y paja

  // Cálculos de Gastos
  const txExpenseTotal      = transactions.filter(t => EXPENSE_TYPES.includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const txExpenseTaxTotal   = transactions.filter(t => EXPENSE_TYPES.includes(t.type)).reduce((s, t) => s + (t.taxAmount || 0), 0);

  const totalExpenseInclTax  = txExpenseTotal;
  const totalTaxPaid         = txExpenseTaxTotal;
  const totalExpenseSubtotal = totalExpenseInclTax - totalTaxPaid;

  // Resumen Final
  const ivaBalance = totalTaxCollected - totalTaxPaid; // Si es positivo, le debemos al SAT. Si es negativo, tenemos saldo a favor.
  const netProfitSubtotal = totalIncomeSubtotal - totalExpenseSubtotal; // Rentabilidad real sin impuestos
  const cashflow = totalIncomeInclTax - totalExpenseInclTax; // Flujo de caja real en banco

  // ── Combined Transactions for Table ───────────────────────
  const virtualTransactions = paidQuotesThisMonth.map(q => ({
    id: `virtual-${q.id}`,
    type: "INGRESO",
    category: "Cobro de Proyecto",
    amount: q.realAmountCollected || 0,
    taxAmount: q.taxable ? (q.total > 0 ? (q.realAmountCollected || 0) * (q.tax / q.total) : 0) : 0,
    description: `Pago registrado: ${q.project}`,
    date: q.closeDate || q.updatedAt,
    status: "ACTIVO",
    isVirtual: true,
    quote: { folio: q.folio, project: q.project },
    client: null,
  }));

  const combinedTransactions = [...transactions, ...virtualTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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

  return (
    <div className="space-y-8 max-w-7xl pb-20 animate-in fade-in duration-500">
      
      {/* ── HEADER & NAVIGATION ──────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Link href="/dashboard/finance" className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-red-600 transition-colors mb-3">
            <ArrowLeft className="w-4 h-4" /> Volver a Finanzas
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight uppercase">
            Historial de <span className="text-red-600">Reportes</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Consulta estructurada de ingresos, gastos y rentabilidad por periodo.
          </p>
        </div>
        
        <HistoryFilter currentMonth={currentMonth} currentYear={currentYear} />
      </div>

      {/* ── FINANCIAL SUMMARY METRICS (Bank App Style) ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* INGRESOS */}
        <div className="bg-emerald-50 rounded-[2rem] p-6 border border-emerald-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowUpRight className="w-24 h-24 text-emerald-600" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Ingresos del Período
            </p>
            <p className="text-4xl font-black text-emerald-700">
              ${totalIncomeSubtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] font-bold text-emerald-600 mt-1">Subtotal (libre de IVA)</p>
            
            <div className="mt-6 pt-5 border-t border-emerald-200/50 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-emerald-800/60">IVA Trasladado (Cobrado)</span>
                <span className="font-black text-emerald-800">+ ${totalTaxCollected.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-sm bg-emerald-100/50 p-3 rounded-xl border border-emerald-200/50">
                <span className="font-black text-emerald-900 uppercase text-[10px] tracking-widest">Flujo en Banco</span>
                <span className="font-black text-emerald-900">${totalIncomeInclTax.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* GASTOS */}
        <div className="bg-rose-50 rounded-[2rem] p-6 border border-rose-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowDownRight className="w-24 h-24 text-rose-600" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-rose-600/60 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Egresos del Período
            </p>
            <p className="text-4xl font-black text-rose-700">
              ${totalExpenseSubtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] font-bold text-rose-600 mt-1">Subtotal (libre de IVA)</p>
            
            <div className="mt-6 pt-5 border-t border-rose-200/50 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-rose-800/60">IVA Acreditable (Pagado)</span>
                <span className="font-black text-rose-800">+ ${totalTaxPaid.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-sm bg-rose-100/50 p-3 rounded-xl border border-rose-200/50">
                <span className="font-black text-rose-900 uppercase text-[10px] tracking-widest">Flujo Saliente</span>
                <span className="font-black text-rose-900">${totalExpenseInclTax.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RESUMEN FINAL / RENTABILIDAD */}
        <div className="bg-gray-900 rounded-[2rem] p-6 border border-gray-800 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Scale className="w-24 h-24 text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${netProfitSubtotal >= 0 ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
              Rentabilidad Real Neta
            </p>
            <p className={`text-4xl font-black ${netProfitSubtotal >= 0 ? "text-white" : "text-red-400"}`}>
              ${netProfitSubtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] font-bold text-gray-500 mt-1">Ingresos Reales − Egresos Reales</p>
            
            <div className="mt-6 pt-5 border-t border-gray-800 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-gray-400">Balance de IVA</span>
                <span className={`font-black ${ivaBalance > 0 ? "text-orange-400" : "text-emerald-400"}`}>
                  {ivaBalance > 0 ? 'Por pagar: ' : 'A favor: '}
                  ${Math.abs(ivaBalance).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                <span className="font-black text-white uppercase text-[10px] tracking-widest">Flujo Efectivo</span>
                <span className={`font-black ${cashflow >= 0 ? 'text-white' : 'text-red-400'}`}>
                  ${cashflow.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── DETAILED MOVEMENTS TABLE ────────────────────────────────── */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-xl text-gray-600 border border-gray-100">
                <Wallet className="h-5 w-5" />
              </div>
              Desglose de Movimientos
            </h3>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              Todo el flujo de dinero registrado en {MONTHS[currentMonth]} {currentYear}
            </p>
          </div>
          <div className="text-[10px] font-black text-gray-500 uppercase bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
            {combinedTransactions.length} transacciones
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
