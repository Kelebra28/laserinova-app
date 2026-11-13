"use client";

import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import type { SalesGroupRow, WhatsAppSalesData } from "@/server/services/whatsapp-sales.service";

const money = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const pct = (n: number | null) => (n === null ? "—" : `${n.toFixed(0)}%`);
const mins = (n: number | null) => {
  if (n === null) return "—";
  if (n < 1) return "<1 min";
  if (n < 60) return `${Math.round(n)} min`;
  if (n < 1440) return `${(n / 60).toFixed(1)} h`;
  return `${(n / 1440).toFixed(1)} d`;
};

const TABS = [
  { id: "embudo", label: "Embudo y cierre" },
  { id: "vende", label: "Qué se vende" },
  { id: "dinero", label: "Dinero por cobrar" },
  { id: "respuesta", label: "Respuesta" },
] as const;

function downloadCsv(name: string, rows: Record<string, string | number | boolean>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number | boolean) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function CsvButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
      <Download className="h-3 w-3" /> CSV
    </button>
  );
}

function GroupTable({ title, rows, file }: { title: string; rows: SalesGroupRow[]; file: string }) {
  const top = rows.slice(0, 8);
  return (
    <Card
      title={title}
      action={
        <CsvButton
          onClick={() =>
            downloadCsv(
              file,
              rows.map((r) => ({
                Nombre: r.label,
                Conceptos: r.items,
                Piezas: r.units,
                Cotizado: Math.round(r.quoted),
                Aprobado: Math.round(r.won),
                "Utilidad aprobada": Math.round(r.utility),
                "% cierre ($)": r.winRate === null ? "" : Math.round(r.winRate),
              })),
            )
          }
        />
      }
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">Sin datos en el periodo</p>
      ) : (
        <>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} fontSize={11} />
                <YAxis type="category" dataKey="label" width={110} fontSize={11} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="quoted" name="Cotizado" fill="#c4b5fd" />
                <Bar dataKey="won" name="Aprobado" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-1">Nombre</th>
                  <th className="text-right">Concept.</th>
                  <th className="text-right">Pzas</th>
                  <th className="text-right">Cotizado</th>
                  <th className="text-right">Aprobado</th>
                  <th className="text-right">Utilidad</th>
                  <th className="text-right">Cierre</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-b border-gray-50">
                    <td className="py-1 font-medium text-gray-800">{r.label}</td>
                    <td className="text-right">{r.items}</td>
                    <td className="text-right">{r.units}</td>
                    <td className="text-right">{money(r.quoted)}</td>
                    <td className="text-right">{money(r.won)}</td>
                    <td className="text-right">{money(r.utility)}</td>
                    <td className="text-right">{pct(r.winRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function WhatsAppSalesClient({ data }: { data: WhatsAppSalesData }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("embudo");
  const f = data.funnel;
  const r = data.response;
  const rec = data.receivable;

  const funnelSteps = [
    { name: "Chats", value: f.chats, color: "#94a3b8" },
    { name: "Con cotización", value: f.chatsWithQuote, color: "#a78bfa" },
    { name: "Cotiz. enviadas", value: f.quotesSent, color: "#8b5cf6" },
    { name: "Aprobadas", value: f.quotesWon, color: "#16a34a" },
    { name: "Cobradas", value: f.quotesPaid, color: "#0d9488" },
  ];
  const heatMax = Math.max(1, ...r.heatmap.flat());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ventas WhatsApp</h1>
          <p className="text-xs text-gray-500">
            Datos reales de los últimos {data.rangeDays} días. Montos sin IVA salvo donde se indica.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/dashboard/ventas-whatsapp?days=${d}`}
              className={`rounded-md px-3 py-1 text-xs font-medium ${data.rangeDays === d ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {d} días
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi label="Chats" value={String(f.chats)} hint={`${f.chatsWithQuote} con cotización`} />
        <Kpi label="Cotizado" value={money(f.amountSent)} hint={`${f.quotesSent} enviadas`} />
        <Kpi label="Aprobado" value={money(f.amountWon)} hint={`${f.quotesWon} ${f.quotesWon === 1 ? "cotización" : "cotizaciones"}`} />
        <Kpi label="% de cierre" value={pct(f.closeRate)} hint={`${f.quotesWon} ganadas / ${f.quotesLost} perdidas`} />
        <Kpi label="Por cobrar" value={money(rec.total)} hint={`${rec.count} aprobadas con saldo`} />
        <Kpi label="1ª respuesta" value={mins(r.medianFirstResponseMin)} hint="mediana" />
      </div>
      {f.chats < 50 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Muestra chica ({f.chats} chats): los porcentajes cambian mucho con un solo cliente. Fíjate también en los números absolutos.
        </p>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "embudo" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Embudo (cantidad)">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelSteps} layout="vertical" margin={{ left: 16, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} fontSize={11} />
                    <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="value" name="Cantidad" label={{ position: "right", fontSize: 11 }}>
                      {funnelSteps.map((s) => (
                        <Cell key={s.name} fill={s.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Conversión entre etapas">
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between"><span>Chat → cotización</span><b>{pct(f.chatToQuoteRate)}</b></li>
                <li className="flex justify-between"><span>Enviada → aprobada</span><b>{pct(f.quotesSent ? (f.quotesWon / f.quotesSent) * 100 : null)}</b></li>
                <li className="flex justify-between"><span>Aprobada → cobrada completa</span><b>{pct(f.quotesWon ? (f.quotesPaid / f.quotesWon) * 100 : null)}</b></li>
                <li className="flex justify-between"><span>Ticket promedio aprobado</span><b>{money(f.avgTicketWon)}</b></li>
                <li className="flex justify-between"><span>Cobrado real en el periodo</span><b>{money(f.amountCollected)}</b></li>
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                Las enviadas aún sin respuesta del cliente cuentan como abiertas: no son ganadas ni perdidas.
              </p>
            </Card>
          </div>
          <Card
            title="Todos los chats del periodo"
            action={
              <CsvButton
                onClick={() =>
                  downloadCsv(
                    "chats-whatsapp",
                    data.chats.map((c) => ({
                      Teléfono: c.phone,
                      Nombre: c.name,
                      Cliente: c.client,
                      Entrantes: c.inbound,
                      Salientes: c.outbound,
                      "Último mensaje": c.lastMessage,
                      Bot: c.botMode ? "Sí" : "No",
                      Cotizaciones: c.quotes,
                      Cotizado: Math.round(c.quotedAmount),
                      Aprobado: Math.round(c.wonAmount),
                      Etapa: c.status,
                    })),
                  )
                }
              />
            }
          >
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-1">Contacto</th>
                    <th>Etapa</th>
                    <th className="text-right">Msj in/out</th>
                    <th className="text-right">Cotizado</th>
                    <th className="text-right">Aprobado</th>
                    <th className="text-right">Último</th>
                  </tr>
                </thead>
                <tbody>
                  {data.chats.map((c) => (
                    <tr key={c.phone} className="border-b border-gray-50">
                      <td className="py-1"><b className="text-gray-800">{c.client || c.name || c.phone}</b>{(c.client || c.name) && <span className="ml-1 text-gray-400">{c.phone}</span>}</td>
                      <td>{c.status}</td>
                      <td className="text-right">{c.inbound}/{c.outbound}</td>
                      <td className="text-right">{c.quotedAmount ? money(c.quotedAmount) : "—"}</td>
                      <td className="text-right">{c.wonAmount ? money(c.wonAmount) : "—"}</td>
                      <td className="text-right">{new Date(c.lastMessage).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "vende" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <GroupTable title="Por tipo de trabajo" rows={data.byType} file="ventas-por-tipo" />
          <GroupTable title="Por categoría de material (acrílico, MDF…)" rows={data.byCategory} file="ventas-por-categoria-material" />
          <GroupTable title="Por material" rows={data.byMaterial} file="ventas-por-material" />
          <GroupTable title="Por producto" rows={data.byProduct} file="ventas-por-producto" />
          <p className="text-xs text-gray-500 lg:col-span-2">
            Solo cuentan cotizaciones enviadas o más avanzadas. “Cierre” es el % del dinero cotizado que ya se aprobó (las abiertas bajan el número). Los conceptos sin material o producto ligado solo aparecen en “tipo de trabajo”.
          </p>
        </div>
      )}

      {tab === "dinero" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Antigüedad de lo que se debe">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rec.buckets}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} fontSize={11} />
                    <Tooltip formatter={(v) => money(Number(v))} />
                    <Bar dataKey="amount" name="Por cobrar" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-gray-500">Saldo de cotizaciones aprobadas, en producción o entregadas (con IVA, de todas las fechas): <b>{money(rec.total)}</b> en {rec.count} cotizaciones. Las cotizaciones solo enviadas no cuentan como deuda.</p>
            </Card>
            <Card
              title="Quién debe"
              action={<CsvButton onClick={() => downloadCsv("por-cobrar", rec.byClient.map((c) => ({ Cliente: c.client, Debe: Math.round(c.amount), Cotizaciones: c.count, "Días más viejo": c.oldestDays })))} />}
            >
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-1">Cliente</th>
                      <th className="text-right">Debe</th>
                      <th className="text-right">Cotiz.</th>
                      <th className="text-right">Días</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rec.byClient.map((c) => (
                      <tr key={c.client} className="border-b border-gray-50">
                        <td className="py-1 font-medium text-gray-800">{c.client}</td>
                        <td className="text-right">{money(c.amount)}</td>
                        <td className="text-right">{c.count}</td>
                        <td className={`text-right ${c.oldestDays > 30 ? "font-bold text-red-600" : ""}`}>{c.oldestDays}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "respuesta" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="Mensajes de clientes" value={String(r.inbound)} />
            <Kpi label="Respuestas enviadas" value={String(r.outbound)} />
            <Kpi label="Atendido por el bot" value={pct(r.botShare)} hint={`${r.botReplies} bot / ${r.humanReplies} humano`} />
            <Kpi label="90% se responde en" value={mins(r.p90FirstResponseMin)} hint={`mediana ${mins(r.medianFirstResponseMin)}`} />
            <Kpi label="Esperando respuesta" value={String(r.unanswered)} hint="el último mensaje es del cliente" />
          </div>
          <Card title="Mensajes por día">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={r.perDay}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" fontSize={11} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="inbound" name="Clientes" stroke="#8b5cf6" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="outbound" name="Respuestas" stroke="#16a34a" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="¿Cuándo escriben los clientes? (hora de México)">
            <div className="overflow-x-auto">
              <table className="text-[10px]">
                <thead>
                  <tr>
                    <th />
                    {Array.from({ length: 24 }, (_, h) => <th key={h} className="w-6 text-center font-normal text-gray-400">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {r.heatmap.map((row, di) => (
                    <tr key={di}>
                      <td className="pr-2 text-gray-500">{DAYS[di]}</td>
                      {row.map((v, h) => (
                        <td key={h} title={`${DAYS[di]} ${h}:00 — ${v} mensajes`} className="h-6 w-6 border border-white text-center" style={{ background: v ? `rgba(139,92,246,${0.15 + 0.85 * (v / heatMax)})` : "#f3f4f6", color: v / heatMax > 0.5 ? "white" : "#6b7280" }}>
                          {v || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
