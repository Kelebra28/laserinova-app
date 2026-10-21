"use client";

import React, { useState } from "react";
import { 
  Database, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  TrendingUp, 
  DollarSign, 
  Bot, 
  Layers 
} from "lucide-react";
import { formatCurrency } from "@/constants/formatters.constants";

interface AnalyticsHeaderProps {
  totals: {
    totalQuotesValue: number;
    totalCollected: number;
    totalAiTokens: number;
    totalAiCostUsd: number;
    totalFinancialVolume: number;
  };
  totalModelsCount: number;
  totalRecordsCount: number;
}

export function AnalyticsHeader({
  totals,
  totalModelsCount,
  totalRecordsCount,
}: AnalyticsHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summary = `Laser Inova CRM - Arquitectura de Datos & Schemas
Modelos documentados: ${totalModelsCount}
Registros en base de datos: ${totalRecordsCount.toLocaleString()}
Volumen cotizado acumulado: ${formatCurrency(totals.totalQuotesValue)}
Cobranza efectiva: ${formatCurrency(totals.totalCollected)}
Tokens IA consumidos: ${totals.totalAiTokens.toLocaleString()} ($${totals.totalAiCostUsd.toFixed(3)} USD)`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-black p-6 md:p-8 text-white shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Arquitectura de Datos & Business Intelligence
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Database className="w-8 h-8 text-red-500" />
              Datos & Analytics Hub
            </h1>
            <p className="text-zinc-400 max-w-2xl text-sm leading-relaxed">
              Mapa visual y relacional de los procesos, tablas y métricas del CRM. Diseñado específicamente para que analistas de datos, ingenieros de BI y dirección dominen el ciclo comercial, WhatsApp, IA y costeo industrial.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white text-xs font-semibold transition-all border border-white/10 shadow-sm"
              title="Copiar resumen general al portapapeles"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? "¡Copiado!" : "Copiar Resumen"}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold transition-all shadow-md shadow-red-900/30 hover:scale-[1.02]"
              title="Imprimir o guardar como PDF para tener los schemas en físico"
            >
              <Printer className="w-4 h-4" />
              Tener en Físico (Imprimir / PDF)
            </button>
          </div>
        </div>

        {/* Live Counters Ribbon */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium uppercase tracking-wider">
              <Layers className="w-4 h-4 text-blue-400" />
              Modelos Documentados
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{totalModelsCount}</span>
              <span className="text-xs text-zinc-500">entidades clave</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              {totalRecordsCount.toLocaleString()} registros activos en BD
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Volumen Cotizado
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {formatCurrency(totals.totalQuotesValue)}
              </span>
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              Cobrado real: {formatCurrency(totals.totalCollected)}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium uppercase tracking-wider">
              <Bot className="w-4 h-4 text-purple-400" />
              Consumo Agente IA
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {(totals.totalAiTokens / 1000).toFixed(1)}k
              </span>
              <span className="text-xs text-zinc-500">tokens</span>
            </div>
            <div className="text-[11px] text-purple-400 mt-1">
              Costo estimado: ${totals.totalAiCostUsd.toFixed(3)} USD
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium uppercase tracking-wider">
              <DollarSign className="w-4 h-4 text-amber-400" />
              Flujo Financiero
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {formatCurrency(totals.totalFinancialVolume)}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              En movimientos de caja y proyectos
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
