"use client";

import React, { useState } from "react";
import { KPI_PLAYBOOK, KpiPlaybookItem } from "@/constants/analytics.constants";
import { 
  Calculator, 
  Code2, 
  Copy, 
  Check, 
  Table, 
  TrendingUp, 
  CheckCircle2, 
  Sparkles 
} from "lucide-react";

export function KpiPlaybookViewer() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopySql = (sql: string, index: number) => {
    navigator.clipboard.writeText(sql);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50/50 via-zinc-50 to-white p-5 rounded-2xl border border-blue-100 flex items-start gap-3">
        <Calculator className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-zinc-900">
            Playbook de Métricas & Consultas SQL Listas para Usar
          </h3>
          <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
            Fórmulas canónicas y queries optimizados en MySQL para que el analista pueda conectar herramientas de Business Intelligence (Power BI, Metabase, Tableau, Python/Pandas) o ejecutar directamente en DBeaver/HeidiSQL sin tener que adivinar las reglas de negocio del CRM.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {KPI_PLAYBOOK.map((item, index) => (
          <div
            key={item.name}
            className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm hover:border-zinc-300 transition-all space-y-4 p-5 md:p-6"
          >
            {/* Header del KPI */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    {item.category}
                  </span>
                  <span className="text-xs text-zinc-400">KPI #{index + 1}</span>
                </div>
                <h4 className="text-base font-extrabold text-zinc-900 mt-1">
                  {item.name}
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-zinc-400 font-semibold uppercase">Tablas:</span>
                {item.sourceTables.map((table) => (
                  <span
                    key={table}
                    className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-bold border border-zinc-200"
                  >
                    {table}
                  </span>
                ))}
              </div>
            </div>

            {/* Descripción y Fórmula */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/80">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Definición & Propósito
                </div>
                <p className="text-zinc-700 leading-relaxed">{item.description}</p>
                <div className="mt-2 pt-2 border-t border-zinc-200/50 text-zinc-600">
                  <strong className="text-zinc-800">Impacto en Decisión:</strong> {item.businessImpact}
                </div>
              </div>

              <div className="bg-zinc-900 text-white p-3.5 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Fórmula Matemática
                  </div>
                  <div className="font-mono text-xs text-zinc-200 bg-white/5 p-2 rounded border border-white/10 mt-1">
                    {item.formula}
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400 mt-2">
                  * Diseñada para reflejar la realidad operativa de Laser Inova.
                </div>
              </div>
            </div>

            {/* Bloque SQL con Copy Button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-zinc-600" />
                  Query SQL de Extracción Canónica (MySQL)
                </span>
                <button
                  onClick={() => handleCopySql(item.sqlSnippet, index)}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold transition-colors"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl overflow-hidden border border-zinc-800 bg-[#1e1e1e] p-4 text-xs font-mono text-zinc-200 overflow-x-auto shadow-inner">
                <pre className="leading-relaxed whitespace-pre-wrap">{item.sqlSnippet}</pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
