"use client";

import React from "react";
import { SCHEMA_MODELS, PROCESS_FLOWS } from "@/constants/analytics.constants";
import { Printer, Download, Check, FileText } from "lucide-react";

interface PrintableSchemaReportProps {
  tableCounts: Record<string, number>;
}

export function PrintableSchemaReport({ tableCounts }: PrintableSchemaReportProps) {
  return (
    <div className="printable-report bg-white text-zinc-900 p-6 md:p-10 rounded-2xl border border-zinc-200 shadow-sm space-y-10">
      {/* Portada / Header de Documentación Física */}
      <div className="border-b-2 border-zinc-900 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-extrabold tracking-widest text-red-600 mb-1">
            Laser Inova CRM — Manual de Arquitectura de Datos
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">
            Diccionario de Datos & Schemas Relacionales
          </h2>
          <p className="text-xs text-zinc-600 mt-1 max-w-2xl">
            Documento canónico para Analistas de Datos (DA), Business Intelligence (BI) e Ingeniería de Software. Describe la estructura de tablas, claves foráneas, reglas de negocio y flujos de procesos.
          </p>
        </div>

        <div className="text-right shrink-0 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md transition-all hover:scale-105"
          >
            <Printer className="w-4 h-4 text-red-400" />
            Imprimir o Guardar PDF
          </button>
        </div>
      </div>

      {/* Resumen de Flujos de Negocio para el Analista */}
      <div className="space-y-6">
        <h3 className="text-lg font-black tracking-tight text-zinc-900 uppercase border-b border-zinc-200 pb-2 flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-600 rounded-sm" />
          1. Resumen de Flujos de Negocio (Pipelines de Datos)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROCESS_FLOWS.map((flow) => (
            <div
              key={flow.id}
              className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3"
            >
              <div>
                <h4 className="text-xs font-bold text-zinc-900">{flow.title}</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">{flow.subtitle}</p>
              </div>

              <div className="space-y-1.5 border-t border-zinc-200 pt-2">
                {flow.nodes.map((n, i) => (
                  <div key={n.id} className="text-[11px] flex items-center justify-between">
                    <span className="font-semibold text-zinc-700">
                      {i + 1}. {n.title.replace(/^\d+\.\s*/, "")}
                    </span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 bg-zinc-200 text-zinc-800 rounded">
                      {n.modelsInvolved[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Catálogo Exhaustivo de Modelos */}
      <div className="space-y-8">
        <h3 className="text-lg font-black tracking-tight text-zinc-900 uppercase border-b border-zinc-200 pb-2 flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-600 rounded-sm" />
          2. Diccionario de Tablas & Campos (Físico)
        </h3>

        <div className="space-y-8">
          {SCHEMA_MODELS.map((model) => {
            const count = tableCounts[model.dbTable] ?? 0;

            return (
              <div
                key={model.id}
                className="space-y-3 break-inside-avoid border border-zinc-200 rounded-xl p-5 bg-white"
              >
                {/* Cabecera del Modelo */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-zinc-900">{model.name}</h4>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-bold">
                        MySQL: `{model.dbTable}`
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5">{model.description}</p>
                  </div>
                  <div className="text-xs text-zinc-500 font-medium shrink-0">
                    Dominio: <strong>{model.domainLabel}</strong> | Filas actuales:{" "}
                    <strong>{count.toLocaleString()}</strong>
                  </div>
                </div>

                {/* Utilidad analítica */}
                <div className="text-xs bg-zinc-50 p-3 rounded-lg border border-zinc-200/70 text-zinc-700">
                  <strong className="text-zinc-900">Propósito Analítico (BI):</strong>{" "}
                  {model.analyticalPurpose}
                </div>

                {/* Tabla de campos */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-700 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-2.5">Columna</th>
                        <th className="py-2 px-2.5">Tipo</th>
                        <th className="py-2 px-2.5">Atributos</th>
                        <th className="py-2 px-2.5">Descripción de Negocio</th>
                        <th className="py-2 px-2.5">Uso para el Analista (Métricas/Joins)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {model.fields.map((field) => (
                        <tr key={field.name}>
                          <td className="py-1.5 px-2.5 font-mono font-bold text-zinc-900">
                            {field.name}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono text-zinc-600">
                            {field.type}
                          </td>
                          <td className="py-1.5 px-2.5">
                            {field.isPk && (
                              <span className="px-1 py-0.5 rounded bg-amber-100 text-amber-900 font-bold mr-1 text-[9px]">
                                PK
                              </span>
                            )}
                            {field.isFk && (
                              <span className="px-1 py-0.5 rounded bg-blue-100 text-blue-900 font-bold mr-1 text-[9px]">
                                FK
                              </span>
                            )}
                            {field.isRequired ? (
                              <span className="text-red-500 font-bold">*req</span>
                            ) : (
                              <span className="text-zinc-400">null</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2.5 text-zinc-600">{field.description}</td>
                          <td className="py-1.5 px-2.5 text-zinc-900 font-medium bg-red-50/10">
                            {field.analyticalUsage}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Relaciones */}
                {model.relations && model.relations.length > 0 && (
                  <div className="text-[11px] text-zinc-600 pt-2 flex flex-wrap gap-2 items-center">
                    <span className="font-bold text-zinc-800">Relaciones ERD:</span>
                    {model.relations.map((r, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700"
                      >
                        {model.dbTable} ➔ {r.targetModel} ({r.type} vía {r.foreignKey})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sección 3: Stack Tecnológico, Alojamiento & Base de Datos */}
      <div className="space-y-4 break-inside-avoid">
        <h3 className="text-lg font-black tracking-tight text-zinc-900 uppercase border-b border-zinc-200 pb-2 flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-600 rounded-sm" />
          3. Ficha Técnica de Infraestructura, Hosting & Base de Datos
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-2">
            <h4 className="font-bold text-zinc-900 uppercase text-[11px]">Servidor & Alojamiento:</h4>
            <div className="text-zinc-700"><strong>Hosting:</strong> Railway Cloud Platform (PaaS) / Linux Container (Node 24.x Active LTS)</div>
            <div className="text-zinc-700"><strong>Dominio Producción:</strong> https://app.laserinova.com</div>
            <div className="text-zinc-700"><strong>Web Server:</strong> Railway Edge Proxy con SSL/TLS automático</div>
            <div className="text-zinc-700"><strong>Supervisor:</strong> Railway Deployment Orchestrator con auto-restart y healthchecks</div>
          </div>

          <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-2">
            <h4 className="font-bold text-zinc-900 uppercase text-[11px]">Base de Datos & ORM:</h4>
            <div className="text-zinc-700"><strong>Motor:</strong> MySQL 8.0 / MariaDB Enterprise (Railway / Hostinger Cloud DB)</div>
            <div className="text-zinc-700"><strong>Nombre DB:</strong> railway_crm_laserinova (u826363020_crm_laser_inov)</div>
            <div className="text-zinc-700"><strong>ORM:</strong> Prisma Client v6.4.1 (Singleton Pattern)</div>
            <div className="text-zinc-700"><strong>Límite de Conexiones:</strong> 1 en desarrollo local, 3 en producción</div>
          </div>

          <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-2">
            <h4 className="font-bold text-zinc-900 uppercase text-[11px]">Inteligencia Artificial (RAG):</h4>
            <div className="text-zinc-700"><strong>Modelo LLM:</strong> Google Gemini 2.0 / 1.5 Flash (@google/generative-ai v0.24)</div>
            <div className="text-zinc-700"><strong>Base Vectorial:</strong> Pinecone (índice: agent-bot-li, @pinecone-database/pinecone v9.0)</div>
            <div className="text-zinc-700"><strong>Auditoría de Costos:</strong> Tabla inmutable AiUsageLog (Tokens / USD)</div>
          </div>

          <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-2">
            <h4 className="font-bold text-zinc-900 uppercase text-[11px]">Comunicaciones & Tiempo Real:</h4>
            <div className="text-zinc-700"><strong>WhatsApp:</strong> Meta WhatsApp Cloud API v21 oficial (Webhooks /api/whatsapp/webhook)</div>
            <div className="text-zinc-700"><strong>WebSockets:</strong> Pusher Channels (pusher v5.3 / pusher-js v8.6) en Cluster us2</div>
            <div className="text-zinc-700"><strong>Correo:</strong> Hostinger Business Mail IMAP (imapflow) y SMTP (nodemailer)</div>
          </div>
        </div>
      </div>

      {/* Pie de página de documento */}
      <div className="border-t border-zinc-300 pt-4 text-center text-xs text-zinc-400 flex flex-col sm:flex-row justify-between items-center gap-2">
        <span>Laser Inova CRM — Base de Datos Operativa MySQL & Next.js 16</span>
        <span>Generado automáticamente para el equipo de Datos & Analítica</span>
      </div>
    </div>
  );
}
