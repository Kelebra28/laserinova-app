"use client";

import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Panel from "../atoms/Panel";
import SegmentedControl from "../atoms/SegmentedControl";
import LegendItem from "../atoms/LegendItem";
import { EmptyState } from "../atoms/EmptyState";
import { CHART_COLORS, CHART_TOOLTIP_STYLE, VOLUME_GRANULARITIES, VOLUME_METRICS, type VolumeGranularity, type VolumeMetric } from "@/constants/dashboard.constants";
import type { DashboardOverview } from "@/types/dashboard";

type Props = { whatsapp: DashboardOverview["whatsapp"] };

const AXIS = { axisLine: false, tickLine: false, tick: { fontSize: 11, fill: CHART_COLORS.tick } } as const;
const MARGIN = { top: 8, right: 8, left: 0, bottom: 0 };
const fmt = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 1 });

/** Usuarios que escriben (nuevos vs recurrentes) o mensajes totales, por día, semana o mes. */
export default function MessageVolumeCard({ whatsapp }: Props) {
  const [metric, setMetric] = useState<VolumeMetric>("users");
  const [granularity, setGranularity] = useState<VolumeGranularity>("day");
  const meta = VOLUME_GRANULARITIES.find((x) => x.id === granularity)!;
  const data = whatsapp.series[granularity];

  const totalIn = data.reduce((s, d) => s + d.inbound, 0);
  const totalOut = data.reduce((s, d) => s + d.outbound, 0);
  const totalNew = data.reduce((s, d) => s + d.newContacts, 0);
  const avgUsers = data.length ? data.reduce((s, d) => s + d.contacts, 0) / data.length : 0;
  const users = metric === "users";
  const empty = users ? data.every((d) => d.contacts === 0) : totalIn + totalOut === 0;

  return (
    <Panel
      title={users ? "Usuarios que nos escriben" : "Mensajes de WhatsApp"}
      subtitle={users ? `Personas distintas que mandaron mensaje · ${meta.hint.toLowerCase()}` : `Todos los mensajes · ${meta.hint.toLowerCase()}`}
      className="h-full"
      action={
        <div className="flex flex-wrap justify-end gap-2">
          <SegmentedControl value={metric} onChange={setMetric} options={VOLUME_METRICS} />
          <SegmentedControl value={granularity} onChange={setGranularity} options={VOLUME_GRANULARITIES} />
        </div>
      }
    >
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4 text-xs text-gray-500">
        {users ? (
          <>
            <LegendItem color="bg-violet-600" label="Nuevos" value={totalNew.toLocaleString("es-MX")} />
            <LegendItem color="bg-violet-200" label="Ya nos habían escrito" />
            <span>
              Promedio <b className="text-gray-900 tabular-nums">{fmt(avgUsers)}</b> usuarios por {meta.unit}
            </span>
          </>
        ) : (
          <>
            <LegendItem color="bg-violet-600" label="Recibidos" value={totalIn.toLocaleString("es-MX")} />
            <LegendItem color="bg-gray-400" label="Enviados" value={totalOut.toLocaleString("es-MX")} />
          </>
        )}
      </div>
      {empty ? (
        <EmptyState text="Sin mensajes en este periodo" />
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {users ? (
              <BarChart data={data} margin={MARGIN}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" minTickGap={24} />
                <YAxis {...AXIS} width={36} allowDecimals={false} />
                <Tooltip cursor={{ fill: CHART_COLORS.cursor }} contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar name="Nuevos" dataKey="newContacts" stackId="u" fill={CHART_COLORS.inbound} />
                <Bar name="Ya nos habían escrito" dataKey="returning" stackId="u" fill={CHART_COLORS.returning} radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={data} margin={MARGIN}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.inbound} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_COLORS.inbound} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.outbound} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.outbound} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" minTickGap={24} />
                <YAxis {...AXIS} width={36} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Area name="Recibidos" type="monotone" dataKey="inbound" stroke={CHART_COLORS.inbound} strokeWidth={2} fill="url(#gIn)" />
                <Area name="Enviados" type="monotone" dataKey="outbound" stroke={CHART_COLORS.outbound} strokeWidth={2} fill="url(#gOut)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
