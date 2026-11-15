"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Panel from "@/components/ui/atoms/Panel";
import LegendItem from "@/components/ui/atoms/LegendItem";
import { EmptyState } from "@/components/ui/atoms/EmptyState";
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from "@/constants/dashboard.constants";
import { formatMoney, formatMoneyCompact } from "@/constants/formatters.constants";
import type { OverviewRow } from "@/types/bank-overview";

const TICK = { fontSize: 11, fill: CHART_COLORS.tick };

/** Ingresos y egresos de cada periodo, lado a lado. */
export default function MonthlyBarsCard({ rows }: { rows: OverviewRow[] }) {
  return (
    <Panel title="Ingresos y egresos por periodo" subtitle="Dinero que entró y salió del banco">
      <div className="flex gap-x-6 mb-4 text-xs">
        <LegendItem color="bg-emerald-500" label="Ingresos" />
        <LegendItem color="bg-red-400" label="Egresos" />
      </div>
      {rows.length === 0 ? (
        <EmptyState text="Sin periodos para mostrar" />
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={TICK} />
              <YAxis axisLine={false} tickLine={false} width={52} tick={TICK} tickFormatter={formatMoneyCompact} />
              <Tooltip cursor={{ fill: CHART_COLORS.cursor }} contentStyle={CHART_TOOLTIP_STYLE} formatter={(v, name) => [formatMoney(Number(v), 2), name as string]} />
              <Bar name="Ingresos" dataKey="income" fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} />
              <Bar name="Egresos" dataKey="expense" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
