"use client";

import React, { useState } from "react";
import { AnalyticsOverviewData } from "@/server/services/analytics.service";
import { AnalyticsHeader } from "./AnalyticsHeader";
import { DataFlowDiagrams } from "./DataFlowDiagrams";
import { SchemaDictionaryViewer } from "./SchemaDictionaryViewer";
import { KpiPlaybookViewer } from "./KpiPlaybookViewer";
import { PrintableSchemaReport } from "./PrintableSchemaReport";
import { TechStackViewer } from "./TechStackViewer";
import { SCHEMA_MODELS } from "@/constants/analytics.constants";
import { 
  GitFork, 
  Database, 
  Calculator, 
  Printer, 
  Layers,
  Server
} from "lucide-react";

interface AnalyticsContainerProps {
  overviewData: AnalyticsOverviewData;
}

export function AnalyticsContainer({ overviewData }: AnalyticsContainerProps) {
  const [activeTab, setActiveTab] = useState<"diagrams" | "schemas" | "kpis" | "tech" | "printable">("diagrams");

  const totalRecordsCount = Object.values(overviewData.tableCounts).reduce(
    (acc, curr) => acc + curr,
    0
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header General */}
      <AnalyticsHeader
        totals={overviewData.totals}
        totalModelsCount={SCHEMA_MODELS.length}
        totalRecordsCount={totalRecordsCount}
      />

      {/* Tabs Principales de Navegación */}
      <div className="flex border-b border-zinc-200 overflow-x-auto custom-scrollbar gap-2 print:hidden">
        <button
          onClick={() => setActiveTab("diagrams")}
          className={`py-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "diagrams"
              ? "border-red-600 text-red-600 bg-red-50/50 rounded-t-xl"
              : "border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
          }`}
        >
          <GitFork className="w-4 h-4" />
          Flujo de Procesos (Diagramas)
        </button>

        <button
          onClick={() => setActiveTab("schemas")}
          className={`py-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "schemas"
              ? "border-red-600 text-red-600 bg-red-50/50 rounded-t-xl"
              : "border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
          }`}
        >
          <Database className="w-4 h-4" />
          Diccionario de Schemas (ERD & Tablas)
        </button>

        <button
          onClick={() => setActiveTab("kpis")}
          className={`py-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "kpis"
              ? "border-red-600 text-red-600 bg-red-50/50 rounded-t-xl"
              : "border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
          }`}
        >
          <Calculator className="w-4 h-4" />
          Playbook de Métricas & Consultas SQL
        </button>

        <button
          onClick={() => setActiveTab("tech")}
          className={`py-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "tech"
              ? "border-red-600 text-red-600 bg-red-50/50 rounded-t-xl"
              : "border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
          }`}
        >
          <Server className="w-4 h-4" />
          Stack Tecnológico & Alojamiento
        </button>

        <button
          onClick={() => setActiveTab("printable")}
          className={`py-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "printable"
              ? "border-red-600 text-red-600 bg-red-50/50 rounded-t-xl"
              : "border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
          }`}
        >
          <Printer className="w-4 h-4" />
          Vista para Imprimir / Físico
        </button>
      </div>

      {/* Vistas según Tab Activo */}
      <div className="pt-2">
        {activeTab === "diagrams" && <DataFlowDiagrams />}

        {activeTab === "schemas" && (
          <SchemaDictionaryViewer tableCounts={overviewData.tableCounts} />
        )}

        {activeTab === "kpis" && <KpiPlaybookViewer />}

        {activeTab === "tech" && <TechStackViewer />}

        {activeTab === "printable" && (
          <PrintableSchemaReport tableCounts={overviewData.tableCounts} />
        )}
      </div>

      {/* Renderizado de apoyo para impresión si se manda imprimir desde otra pestaña */}
      <div className="hidden print:block">
        <PrintableSchemaReport tableCounts={overviewData.tableCounts} />
      </div>
    </div>
  );
}
