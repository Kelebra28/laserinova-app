"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Panel from "../atoms/Panel";
import LegendItem from "../atoms/LegendItem";
import { EmptyState } from "../atoms/EmptyState";
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from "@/constants/dashboard.constants";
import { formatMoney, formatMoneyCompact } from "@/constants/formatters.constants";
import type { DashboardStats } from "@/types/dashboard";

type Props = { chart: DashboardStats["chart"]; totals: DashboardStats["chartTotals"] };

const TICK = { fontSize: 11, fill: CHART_COLORS.tick };

/** Ingresos contra gastos de los últimos 6 meses, con la utilidad como línea. */
export default function CashflowCard({ chart, totals }: Props) {
  const hasData = chart.some((m) => m.income > 0 || m.expense > 0);
  return (
    <Panel title="Ingresos vs gastos" subtitle="Últimos 6 meses · dinero cobrado y gastado" className="h-full">
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4 text-xs">
        <LegendItem color="bg-emerald-500" label="Ingresos" value={formatMoney(totals.income)} />
        <LegendItem color="bg-red-400" label="Gastos" value={formatMoney(totals.expense)} />
        <LegendItem color="bg-gray-900" label="Utilidad" value={formatMoney(totals.income - totals.expense)} />
      </div>
      {hasData ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={TICK} />
              <YAxis axisLine={false} tickLine={false} width={48} tick={TICK} tickFormatter={formatMoneyCompact} />
              <Tooltip cursor={{ fill: CHART_COLORS.cursor }} contentStyle={CHART_TOOLTIP_STYLE} formatter={(v, name) => [formatMoney(Number(v), 2), name as string]} />
              <Bar name="Ingresos" dataKey="income" fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} barSize={18} />
              <Bar name="Gastos" dataKey="expense" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} barSize={18} />
              <Line name="Utilidad" type="monotone" dataKey="profit" stroke={CHART_COLORS.profitLine} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState text="Aún no hay movimientos registrados en estos meses" />
      )}
    </Panel>
  );
}
