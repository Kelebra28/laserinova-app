"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Wallet,
  TrendingDown,
  TrendingUp,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardStats } from "@/server/actions/dashboard.actions";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { formatDueDate, isDatePast } from "@/lib/dates";

const money = (n: number, decimals = 0) =>
  `$${n.toLocaleString("es-MX", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

const compact = (n: number) =>
  Math.abs(n) >= 1000 ? `$${(n / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })}k` : `$${n}`;

type Stats = NonNullable<Awaited<ReturnType<typeof getDashboardStats>>["data"]>;

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
    <div className="space-y-6 pb-16 animate-in fade-in duration-500">
      <Header monthLabel={data.monthLabel} />
      <Kpis kpis={data.kpis} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <CashflowChart chart={data.chart} totals={data.chartTotals} />
        </div>
        <Pipeline pipeline={data.pipeline} month={data.pipelineMonth} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Attention groups={data.attention} />
        <ActiveTasks tasks={data.activeTasks} open={data.tasksOpen} />
        <div className="flex flex-col gap-6">
          <TopList
            title="Mejores clientes"
            subtitle="Cotizado este mes"
            empty="Aún no hay cotizaciones este mes"
            rows={data.topClients.map((c) => ({ label: c.name, sub: `${c.count} cotizaci${c.count === 1 ? "ón" : "ones"}`, value: c.total }))}
          />
          <TopList
            title="Materiales con más venta"
            subtitle="Importe vendido este mes"
            empty="Sin materiales vendidos este mes"
            rows={data.topMaterials.map((m) => ({ label: m.name, sub: `${m.quantity.toLocaleString("es-MX")} pzas`, value: m.amount }))}
          />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Encabezado ───────────────────────── */

function Header({ monthLabel }: { monthLabel: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Panel de <span className="text-red-600">Control</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">{monthLabel}</p>
      </div>
      <Link
        href="/dashboard/quotes/new"
        prefetch={false}
        className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-colors active:scale-95"
      >
        <Plus className="h-4 w-4 text-red-500" />
        Nueva cotización
      </Link>
    </div>
  );
}

/* ───────────────────────── KPIs ───────────────────────── */

function Change({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null) return <span className="text-xs text-gray-400">Sin mes previo para comparar</span>;
  const up = value >= 0;
  const good = inverse ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${good ? "text-emerald-600" : "text-red-600"}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value).toFixed(0)}%
      <span className="font-medium text-gray-400">vs mes anterior</span>
    </span>
  );
}

function Kpi({ label, value, icon: Icon, tone, children }: { label: string; value: string; icon: LucideIcon; tone: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <p className="text-2xl font-black text-gray-900 leading-none tabular-nums">{value}</p>
      <div className="mt-3 min-h-4">{children}</div>
    </div>
  );
}

function Kpis({ kpis }: { kpis: Stats["kpis"] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Kpi label="Cobrado en el mes" value={money(kpis.income)} icon={Wallet} tone="text-emerald-500">
        <Change value={kpis.incomeChange} />
      </Kpi>
      <Kpi label="Gastos del mes" value={money(kpis.expense)} icon={TrendingDown} tone="text-red-500">
        <Change value={kpis.expenseChange} inverse />
      </Kpi>
      <Kpi label="Utilidad del mes" value={money(kpis.profit)} icon={TrendingUp} tone={kpis.profit >= 0 ? "text-emerald-500" : "text-red-500"}>
        <Change value={kpis.profitChange} />
      </Kpi>
      <Kpi label="Por cobrar" value={money(kpis.receivable)} icon={Hourglass} tone="text-amber-500">
        <span className="text-xs text-gray-500">
          {kpis.receivableCount} cotizaci{kpis.receivableCount === 1 ? "ón" : "ones"} con saldo
        </span>
      </Kpi>
    </div>
  );
}

/* ───────────────────────── Gráfica ───────────────────────── */

function Card({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col ${className}`}>
      <div className="mb-4">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function CashflowChart({ chart, totals }: { chart: Stats["chart"]; totals: Stats["chartTotals"] }) {
  const hasData = chart.some((m) => m.income > 0 || m.expense > 0);
  return (
    <Card title="Ingresos vs gastos" subtitle="Últimos 6 meses · dinero cobrado y gastado" className="h-full">
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4 text-xs">
        <Legend color="bg-emerald-500" label="Ingresos" value={money(totals.income)} />
        <Legend color="bg-red-400" label="Gastos" value={money(totals.expense)} />
        <Legend color="bg-gray-900" label="Utilidad" value={money(totals.income - totals.expense)} />
      </div>
      {hasData ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis axisLine={false} tickLine={false} width={48} tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={compact} />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9", boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)", fontSize: 12 }}
                formatter={(v, name) => [money(Number(v), 2), name as string]}
              />
              <Bar name="Ingresos" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
              <Bar name="Gastos" dataKey="expense" fill="#f87171" radius={[4, 4, 0, 0]} barSize={18} />
              <Line name="Utilidad" type="monotone" dataKey="profit" stroke="#111827" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty text="Aún no hay movimientos registrados en estos meses" />
      )}
    </Card>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-gray-500">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
      <span className="font-bold text-gray-900 tabular-nums">{value}</span>
    </span>
  );
}

/* ───────────────────────── Embudo ───────────────────────── */

function Pipeline({ pipeline, month }: { pipeline: Stats["pipeline"]; month: Stats["pipelineMonth"] }) {
  const max = Math.max(...pipeline.map((p) => p.amount), 1);
  const totalOpen = pipeline.reduce((s, p) => s + p.amount, 0);
  return (
    <Card title="Cotizaciones abiertas" subtitle={`${money(totalOpen)} en proceso`}>
      <div className="space-y-4 flex-1">
        {pipeline.map((p) => (
          <div key={p.key}>
            <div className="flex items-baseline justify-between text-xs mb-1.5">
              <span className="font-semibold text-gray-700">
                {p.label} <span className="text-gray-400 font-medium">· {p.count}</span>
              </span>
              <span className="font-bold text-gray-900 tabular-nums">{money(p.amount)}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(p.amount / max) * 100}%`, backgroundColor: p.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="text-gray-500">Creadas este mes</p>
          <p className="text-lg font-black text-gray-900">{month.created}</p>
        </div>
        <div>
          <p className="text-gray-500">Tasa de cierre</p>
          <p className="text-lg font-black text-gray-900">{month.conversionRate === null ? "—" : `${month.conversionRate.toFixed(0)}%`}</p>
        </div>
      </div>
    </Card>
  );
}

/* ───────────────────────── Atención ───────────────────────── */

const toneStyles = {
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-700",
  orange: "bg-orange-50 text-orange-700",
};

function Attention({ groups }: { groups: Stats["attention"] }) {
  return (
    <Card title="Requiere atención" subtitle="Lo que se está quedando sin seguimiento">
      {groups.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <p className="text-sm font-semibold text-gray-700">Todo al día</p>
          <p className="text-xs text-gray-500">No hay pendientes vencidos ni cotizaciones estancadas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.key}>
              <p className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md mb-2 ${toneStyles[g.tone]}`}>
                <AlertTriangle className="h-3 w-3" />
                {g.label}
              </p>
              <ul className="space-y-1">
                {g.items.map((it) => (
                  <li key={it.id}>
                    <Link href={it.href} prefetch={false} className="block rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-semibold text-gray-900 truncate">{it.title}</p>
                      <p className="text-xs text-gray-500 truncate">{it.detail}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ───────────────────────── Tareas ───────────────────────── */

function ActiveTasks({ tasks, open }: { tasks: Stats["activeTasks"]; open: number }) {
  return (
    <Card title="Tareas del equipo" subtitle={`${open} abiertas`}>
      {tasks.length === 0 ? (
        <Empty text="No hay tareas en curso" />
      ) : (
        <ul className="space-y-4">
          {tasks.map((t) => {
            const due = t.dueDate;
            const overdue = isDatePast(due);
            return (
              <li key={t.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{t.title}</p>
                  {due && (
                    <span className={`shrink-0 text-[11px] font-bold ${overdue ? "text-red-600" : "text-gray-500"}`}>
                      {formatDueDate(due, { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${t.status === "IN_PROGRESS" ? t.progress : 0}%` }} />
                  </div>
                  <span className="text-[11px] text-gray-500 w-20 text-right">
                    {t.status === "IN_PROGRESS" ? `En curso · ${t.progress}%` : "Pendiente"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Link href="/dashboard/tasks" prefetch={false} className="mt-auto pt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700">
        Ver todas las tareas →
      </Link>
    </Card>
  );
}

/* ───────────────────────── Rankings ───────────────────────── */

function TopList({ title, subtitle, empty, rows }: { title: string; subtitle: string; empty: string; rows: { label: string; sub: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <Card title={title} subtitle={subtitle}>
      {rows.length === 0 ? (
        <Empty text={empty} />
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <li key={`${r.label}-${i}`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-gray-900 truncate">{r.label}</span>
                <span className="font-bold text-gray-900 tabular-nums shrink-0">{money(r.value)}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-gray-900 rounded-full" style={{ width: `${(r.value / max) * 100}%` }} />
                </div>
                <span className="text-[11px] text-gray-500 shrink-0">{r.sub}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex-1 flex items-center justify-center text-center text-sm text-gray-400 py-10">{text}</div>;
}
