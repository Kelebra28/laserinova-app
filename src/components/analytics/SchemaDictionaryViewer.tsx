"use client";

import React, { useState, useMemo } from "react";
import { 
  SCHEMA_MODELS, 
  DATA_DOMAINS, 
  SchemaModel 
} from "@/constants/analytics.constants";
import { 
  Search, 
  Database, 
  Key, 
  Link as LinkIcon, 
  Layers, 
  Check, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  HelpCircle,
  Table as TableIcon
} from "lucide-react";

interface SchemaDictionaryViewerProps {
  tableCounts: Record<string, number>;
}

export function SchemaDictionaryViewer({ tableCounts }: SchemaDictionaryViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("ALL");
  const [expandedModelId, setExpandedModelId] = useState<string | null>(SCHEMA_MODELS[0]?.id || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtrado de modelos
  const filteredModels = useMemo(() => {
    return SCHEMA_MODELS.filter((model) => {
      const matchesDomain = selectedDomain === "ALL" || model.domain === selectedDomain;
      
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesDomain;

      const matchesName = model.name.toLowerCase().includes(query) || model.dbTable.toLowerCase().includes(query);
      const matchesDesc = model.description.toLowerCase().includes(query) || model.analyticalPurpose.toLowerCase().includes(query);
      const matchesFields = model.fields.some(
        (f) => f.name.toLowerCase().includes(query) || f.analyticalUsage.toLowerCase().includes(query)
      );

      return matchesDomain && (matchesName || matchesDesc || matchesFields);
    });
  }, [searchQuery, selectedDomain]);

  const toggleExpand = (id: string) => {
    setExpandedModelId((prev) => (prev === id ? null : id));
  };

  const handleCopyPrismaModel = (model: SchemaModel) => {
    const fieldsFormatted = model.fields
      .map((f) => `  ${f.name.padEnd(22)} ${f.type.padEnd(16)} // ${f.description}`)
      .join("\n");
    const code = `// Modelo Prisma: ${model.name}\n// Tabla: ${model.dbTable}\nmodel ${model.dbTable} {\n${fieldsFormatted}\n}`;

    navigator.clipboard.writeText(code);
    setCopiedId(model.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Controles de búsqueda y filtros */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Barra de Búsqueda */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por tabla, columna (ej. folio, realAmountCollected) o KPI..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm"
          />
        </div>

        {/* Contador de resultados */}
        <div className="text-xs text-zinc-500 font-medium shrink-0 flex items-center gap-1.5 self-center">
          <TableIcon className="w-4 h-4 text-zinc-400" />
          <span>Mostrando <strong>{filteredModels.length}</strong> de {SCHEMA_MODELS.length} modelos</span>
        </div>
      </div>

      {/* Filtros por Dominio */}
      <div className="flex flex-wrap gap-2">
        {DATA_DOMAINS.map((domain) => {
          const isSelected = selectedDomain === domain.id;
          return (
            <button
              key={domain.id}
              onClick={() => setSelectedDomain(domain.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                isSelected
                  ? "bg-zinc-900 text-white border-zinc-800 shadow-sm scale-105"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              {domain.label}
            </button>
          );
        })}
      </div>

      {/* Lista de Modelos */}
      <div className="space-y-4">
        {filteredModels.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-zinc-200">
            <Database className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-zinc-700">No se encontraron modelos coincidentes</h3>
            <p className="text-xs text-zinc-500 mt-1">Prueba con otro término de búsqueda o selecciona otro dominio.</p>
          </div>
        ) : (
          filteredModels.map((model) => {
            const isExpanded = expandedModelId === model.id;
            const count = tableCounts[model.dbTable] ?? 0;

            return (
              <div
                key={model.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? "border-zinc-300 shadow-lg ring-1 ring-zinc-300/50"
                    : "border-zinc-200 hover:border-zinc-300 shadow-sm"
                }`}
              >
                {/* Cabecera del Modelo */}
                <div
                  onClick={() => toggleExpand(model.id)}
                  className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none hover:bg-zinc-50/50 transition-colors"
                >
                  <div className="flex items-start md:items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-zinc-900 text-white shrink-0 mt-0.5 md:mt-0">
                      <TableIcon className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-extrabold text-zinc-900">{model.name}</h3>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                          table: {model.dbTable}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          {model.domainLabel}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{model.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-zinc-800">
                        {count.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                        Registros en BD
                      </div>
                    </div>
                    <button
                      type="button"
                      className="p-2 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Contenido Desplegable */}
                {isExpanded && (
                  <div className="border-t border-zinc-200 p-5 md:p-6 bg-zinc-50/50 space-y-6">
                    {/* Propósito Analítico */}
                    <div className="bg-white p-4 rounded-xl border border-zinc-200 space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Valor Analítico para el Data Analyst (BI & KPIs)
                      </h4>
                      <p className="text-xs md:text-sm text-zinc-700 leading-relaxed">
                        {model.analyticalPurpose}
                      </p>
                    </div>

                    {/* Métricas clave que responde este modelo */}
                    {model.keyMetrics && model.keyMetrics.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                          Preguntas de Negocio que responde esta entidad:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {model.keyMetrics.map((metric, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 bg-white px-3 py-2 rounded-lg border border-zinc-200 text-xs text-zinc-700"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                              <span>{metric}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Relaciones con otras tablas */}
                    {model.relations && model.relations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
                          Relaciones Foráneas (ERD Joins)
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {model.relations.map((rel, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2"
                            >
                              <span className="font-bold text-zinc-900">{rel.targetModel}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-bold">
                                {rel.type}
                              </span>
                              <span className="text-zinc-400 text-[11px]">vía {rel.foreignKey}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tabla de Columnas y Campos */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-zinc-400" />
                          Diccionario de Campos ({model.fields.length} columnas)
                        </h4>
                        <button
                          onClick={() => handleCopyPrismaModel(model)}
                          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-medium px-2.5 py-1 rounded-md bg-white border border-zinc-200 hover:bg-zinc-100 transition-colors"
                        >
                          {copiedId === model.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600">¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar DDL/Prisma</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-100/70 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[10px]">
                              <th className="py-2.5 px-3">Campo</th>
                              <th className="py-2.5 px-3">Tipo de Dato</th>
                              <th className="py-2.5 px-3">Atributos</th>
                              <th className="py-2.5 px-3">Descripción Funcional</th>
                              <th className="py-2.5 px-3">Utilidad Analítica (DA / BI)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-normal">
                            {model.fields.map((field) => (
                              <tr key={field.name} className="hover:bg-zinc-50/80 transition-colors">
                                <td className="py-2 px-3 font-mono font-bold text-zinc-900 whitespace-nowrap">
                                  {field.name}
                                </td>
                                <td className="py-2 px-3 font-mono text-zinc-600 whitespace-nowrap">
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[11px]">
                                    {field.type}
                                  </span>
                                </td>
                                <td className="py-2 px-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1">
                                    {field.isPk && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                        <Key className="w-2.5 h-2.5" /> PK
                                      </span>
                                    )}
                                    {field.isFk && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                                        <LinkIcon className="w-2.5 h-2.5" /> FK
                                      </span>
                                    )}
                                    {field.isRequired ? (
                                      <span className="text-[10px] text-red-500 font-bold">*</span>
                                    ) : (
                                      <span className="text-[10px] text-zinc-400">null</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-zinc-600 min-w-[200px]">
                                  {field.description}
                                </td>
                                <td className="py-2 px-3 text-zinc-800 font-medium min-w-[240px] bg-red-50/20">
                                  {field.analyticalUsage}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
