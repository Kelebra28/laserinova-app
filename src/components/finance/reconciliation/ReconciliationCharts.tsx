"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Panel from "@/components/ui/atoms/Panel";
import LegendItem from "@/components/ui/atoms/LegendItem";
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from "@/constants/dashboard.constants";
import { RECON_COLORS } from "@/constants/reconciliation.constants";
import { formatMoney, formatMoneyCompact, formatPercent, formatShortDate } from "@/constants/formatters.constants";
import ChargesBreakdownCard from "./ChargesBreakdownCard";
import { breakdownCharges } from "@/lib/bank-categories";
import type { BankLine, ReconResult } from "@/types/reconciliation";

type Props = { result: ReconResult; lineCount: number; lines: BankLine[] };

const TICK = { fontSize: 11, fill: CHART_COLORS.tick };
const abs = (xs: { amount: number }[]) => xs.reduce((s, x) => s + Math.abs(x.amount), 0);

/** Qué tanto cuadra y cómo se acumula la diferencia día por día. */
export default function ReconciliationCharts({ result: r, lineCount, lines }: Props) {
  const matchedLines = r.matches.reduce((s, m) => s + m.bank.length, 0);
  const parts = [
    { key: "matched", label: "Conciliado", color: RECON_COLORS.matched, count: matchedLines, amount: r.totals.matchedAmount },
    { key: "bankOnly", label: "Solo en el banco", color: RECON_COLORS.bankOnly, count: r.bankOnly.length, amount: abs(r.bankOnly) },
    { key: "systemOnly", label: "Solo en el sistema", color: RECON_COLORS.systemOnly, count: r.systemOnly.length, amount: abs(r.systemOnly) },
    { key: "cash", label: "Efectivo", color: RECON_COLORS.cash, count: r.cash.length, amount: abs(r.cash) },
  ];
  const total = parts.reduce((s, p) => s + p.amount, 0) || 1;
  const pct = lineCount > 0 ? (matchedLines / lineCount) * 100 : null;

  const daily = r.daily.reduce<{ date: string; bank: number; system: number; label: string; gap: number }[]>((acc, d) => {
    const prev = acc.length ? acc[acc.length - 1].gap : 0;
    acc.push({ ...d, label: formatShortDate(d.date), gap: Math.round((prev + d.bank - d.system) * 100) / 100 });
    return acc;
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Panel title="Qué tanto cuadra" subtitle="Renglones del banco conciliados" className="h-full">
        <p className="text-4xl font-black text-gray-900 tabular-nums">{formatPercent(pct)}</p>
        <p className="text-xs text-gray-500 mt-1">
          {matchedLines} de {lineCount} renglones del banco
        </p>
        <div className="mt-5 flex h-3 rounded-full overflow-hidden bg-gray-100">
          {parts.map((p) => (
            <div key={p.key} title={`${p.label}: ${formatMoney(p.amount, 2)}`} style={{ width: `${(p.amount / total) * 100}%`, backgroundColor: p.color }} />
          ))}
        </div>
        <ul className="mt-4 space-y-2 text-xs">
          {parts.map((p) => (
            <li key={p.key} className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-gray-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.label} <span className="text-gray-400">· {p.count}</span>
              </span>
              <span className="font-bold text-gray-900 tabular-nums">{formatMoney(p.amount)}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="xl:col-span-2">
        <Panel title="Banco contra sistema, día por día" subtitle="Neto de cada día (entradas − salidas, sin efectivo) y la diferencia acumulada" className="h-full">
          <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4 text-xs">
            <LegendItem color="bg-gray-900" label="Banco" />
            <LegendItem color="bg-gray-400" label="Sistema" />
            <LegendItem color="bg-amber-500" label="Diferencia acumulada" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={TICK} interval="preserveStartEnd" minTickGap={16} />
                <YAxis axisLine={false} tickLine={false} width={52} tick={TICK} tickFormatter={formatMoneyCompact} />
                <Tooltip cursor={{ fill: CHART_COLORS.cursor }} contentStyle={CHART_TOOLTIP_STYLE} formatter={(v, name) => [formatMoney(Number(v), 2), name as string]} />
                <Bar name="Banco" dataKey="bank" fill={RECON_COLORS.bank} radius={[3, 3, 0, 0]} />
                <Bar name="Sistema" dataKey="system" fill={RECON_COLORS.system} radius={[3, 3, 0, 0]} />
                <Line name="Diferencia acumulada" type="monotone" dataKey="gap" stroke={RECON_COLORS.difference} strokeWidth={2} dot={{ r: 2.5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <div className="xl:col-span-3">
        <ChargesBreakdownCard breakdown={breakdownCharges(lines)} />
      </div>
    </div>
  );
}
