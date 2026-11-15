"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Panel from "@/components/ui/atoms/Panel";
import LegendItem from "@/components/ui/atoms/LegendItem";
import { EmptyState } from "@/components/ui/atoms/EmptyState";
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from "@/constants/dashboard.constants";
import { formatMoney, formatMoneyCompact } from "@/constants/formatters.constants";
import type { FinanceOverview } from "@/types/finance";

type Props = { daily: FinanceOverview["daily"]; income: number; expenses: number };

const TICK = { fontSize: 11, fill: CHART_COLORS.tick };

/** Ingresos contra gastos, día por día del mes elegido. */
export default function DailyFlowCard({ daily, income, expenses }: Props) {
  const hasData = daily.some((d) => d.income > 0 || d.expense > 0);
  return (
    <Panel title="Flujo del mes" subtitle="Dinero cobrado y gastado, día por día" className="h-full">
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4 text-xs">
        <LegendItem color="bg-emerald-500" label="Ingresos" value={formatMoney(income)} />
        <LegendItem color="bg-red-400" label="Gastos" value={formatMoney(expenses)} />
      </div>
      {hasData ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={TICK} interval="preserveStartEnd" minTickGap={12} />
              <YAxis axisLine={false} tickLine={false} width={48} tick={TICK} tickFormatter={formatMoneyCompact} />
              <Tooltip
                cursor={{ fill: CHART_COLORS.cursor }}
                contentStyle={CHART_TOOLTIP_STYLE}
                labelFormatter={(d) => `Día ${d}`}
                formatter={(v, name) => [formatMoney(Number(v), 2), name as string]}
              />
              <Bar name="Ingresos" dataKey="income" fill={CHART_COLORS.income} radius={[3, 3, 0, 0]} />
              <Bar name="Gastos" dataKey="expense" fill={CHART_COLORS.expense} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState text="Aún no hay movimientos en este mes" />
      )}
    </Panel>
  );
}
