import type { DashboardOverview } from "@/types/dashboard";

type Cell = string | number | null;

const esc = (v: Cell) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const r1 = (n: number | null) => (n === null ? "" : Math.round(n * 10) / 10);

/** Descarga el resumen del periodo en un CSV (abre bien en Excel: UTF-8 con BOM). */
export function exportOverviewCsv(o: DashboardOverview) {
  const { finance: f, whatsapp: wa, funnel, receivable } = o;
  const rows: Cell[][] = [
    ["Sección", "Concepto", "Valor", "Detalle"],
    ["Periodo", o.rangeLabel, "", `Generado ${new Date(o.generatedAt).toLocaleString("es-MX")}`],
    ["Finanzas", "Cobrado", r1(f.income.value), `Cambio ${r1(f.income.change) === "" ? "n/d" : `${r1(f.income.change)}%`}`],
    ["Finanzas", "Gastos", r1(f.expense.value), `Cambio ${r1(f.expense.change) === "" ? "n/d" : `${r1(f.expense.change)}%`}`],
    ["Finanzas", "Utilidad", r1(f.profit.value), `Cambio ${r1(f.profit.change) === "" ? "n/d" : `${r1(f.profit.change)}%`}`],
    ["WhatsApp", "Mensajes recibidos", wa.inbound.value, ""],
    ["WhatsApp", "Mensajes enviados", wa.outbound.value, ""],
    ["WhatsApp", "Respuesta mediana (min)", r1(wa.medianResponseMin), ""],
    ["WhatsApp", "Respuesta p90 (min)", r1(wa.p90ResponseMin), ""],
    ["WhatsApp", "Respuestas del bot", wa.botReplies, ""],
    ["WhatsApp", "Respuestas del equipo", wa.humanReplies, ""],
    ["WhatsApp", "Contactos nuevos", wa.newContacts.value, ""],
    ["WhatsApp", "Usuarios que escribieron", wa.writers.value, ""],
    ["WhatsApp", "Pendientes: por responder", wa.pending.groups.respond.count, "Te toca a ti"],
    ["WhatsApp", "Pendientes: falta cotización", wa.pending.groups.quote.count, "Te toca a ti"],
    ["WhatsApp", "Pendientes: cliente quedó en enviar", wa.pending.groups.clientSend.count, "Espera al cliente"],
    ["WhatsApp", "Pendientes: cotización sin respuesta", wa.pending.groups.quoteSent.count, "Espera al cliente"],
    ...funnel.steps.map((s): Cell[] => ["Embudo", s.label, s.count, s.amount === null ? "" : `$${Math.round(s.amount)}`]),
    ["Embudo", "Tasa de cierre (%)", r1(funnel.closeRate), ""],
    ["Embudo", "Ticket promedio", r1(funnel.avgTicket), ""],
    ...receivable.aging.map((b): Cell[] => ["Por cobrar", b.label, Math.round(b.amount), `${b.count} cotizaciones`]),
    ...receivable.topDebtors.map((d): Cell[] => ["Por cobrar", `Deudor: ${d.client}`, Math.round(d.amount), `${d.count} cotizaciones, la más vieja hace ${d.oldestDays} d`]),
    ...wa.series.day.map((d): Cell[] => ["Usuarios por día", d.label, d.contacts, `Nuevos ${d.newContacts} · mensajes recibidos ${d.inbound} · enviados ${d.outbound}`]),
    ...wa.series.week.map((d): Cell[] => ["Usuarios por semana", d.label, d.contacts, `Nuevos ${d.newContacts} · mensajes recibidos ${d.inbound} · enviados ${d.outbound}`]),
    ...wa.series.month.map((d): Cell[] => ["Usuarios por mes", d.label, d.contacts, `Nuevos ${d.newContacts} · mensajes recibidos ${d.inbound} · enviados ${d.outbound}`]),
  ];
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `dashboard-${o.range}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
