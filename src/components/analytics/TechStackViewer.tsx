"use client";

import React, { useState } from "react";
import { TECH_STACK_SPEC } from "@/constants/analytics.constants";
import { 
  Server, 
  Database, 
  Bot, 
  MessageSquare, 
  Package, 
  Search, 
  ShieldCheck, 
  Cpu, 
  Globe, 
  Terminal, 
  Zap, 
  Check, 
  Copy 
} from "lucide-react";

export function TechStackViewer() {
  const [packageSearch, setPackageSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const categories = ["ALL", "Framework & Core", "Base de Datos & ORM", "Inteligencia Artificial", "Tiempo Real & Comunicación", "Archivos & Reportes", "UI & Estilos"];

  const filteredPackages = TECH_STACK_SPEC.packages.filter((pkg) => {
    const matchesCat = selectedCategory === "ALL" || pkg.category === selectedCategory;
    const matchesQuery = pkg.name.toLowerCase().includes(packageSearch.toLowerCase()) || 
                         pkg.purpose.toLowerCase().includes(packageSearch.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Banner de Arquitectura */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-black text-white p-6 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-widest mb-2">
              <Server className="w-3.5 h-3.5" />
              Especificación de Infraestructura & Entorno
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Stack Tecnológico, Versiones & Alojamiento
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Ficha técnica exhaustiva para que el Analista de Datos entienda el entorno de ejecución, conectores de base de datos, arquitectura de Inteligencia Artificial (RAG) y dependencias de producción.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-zinc-200">Producción: Railway Cloud Platform</span>
          </div>
        </div>
      </div>

      {/* Grid de Bloques Principales de Infraestructura */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Hosting & Servidor */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900">1. Servidor & Alojamiento Web</h3>
                <p className="text-[11px] text-zinc-500">Dónde corre la aplicación y runtime</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
              Railway PaaS
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Proveedor de Cloud:</span>
              <strong className="text-zinc-900 font-semibold">{TECH_STACK_SPEC.hosting.provider}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Dominio de Producción:</span>
              <span className="font-mono text-blue-600 font-bold">{TECH_STACK_SPEC.hosting.environmentUrl}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Runtime de Ejecución:</span>
              <strong className="text-zinc-900">{TECH_STACK_SPEC.hosting.runtime}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Servidor Web / Reverse Proxy:</span>
              <span className="text-zinc-700">{TECH_STACK_SPEC.hosting.proxy}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Supervisor de Procesos:</span>
              <span className="text-zinc-700">{TECH_STACK_SPEC.hosting.supervisor}</span>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200/80 text-[11px] text-amber-900">
              <strong>Regla de Renderizado:</strong> {TECH_STACK_SPEC.hosting.notes}
            </div>
          </div>
        </div>

        {/* 2. Base de Datos & Pool de Conexiones */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900">2. Base de Datos Relacional</h3>
                <p className="text-[11px] text-zinc-500">Motor MySQL y capa Prisma</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              MySQL / MariaDB
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Motor SQL:</span>
              <strong className="text-zinc-900 font-semibold">{TECH_STACK_SPEC.database.engine}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Host en Producción:</span>
              <span className="font-mono text-zinc-800 font-semibold">{TECH_STACK_SPEC.database.hostProduction}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Nombre de la Base:</span>
              <span className="font-mono text-zinc-900 font-bold">{TECH_STACK_SPEC.database.databaseName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Límite de Conexiones:</span>
              <strong className="text-emerald-700">{TECH_STACK_SPEC.database.connectionLimits}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">ORM de Acceso:</span>
              <span className="font-mono text-zinc-700">{TECH_STACK_SPEC.database.orm}</span>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200/80 text-[11px] text-emerald-950">
              <strong>Protección Anti-Baneo Hostinger:</strong> {TECH_STACK_SPEC.database.idleTimeout}
            </div>
          </div>
        </div>

        {/* 3. Agente de Inteligencia Artificial & Pinecone RAG */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900">3. Inteligencia Artificial & RAG</h3>
                <p className="text-[11px] text-zinc-500">Google Gemini + Pinecone Vector DB</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
              Gemini + Pinecone
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Modelo Principal:</span>
              <strong className="text-zinc-900">{TECH_STACK_SPEC.aiAgent.primaryModel}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Base de Datos Vectorial:</span>
              <strong className="text-purple-700 font-semibold">{TECH_STACK_SPEC.aiAgent.vectorDb}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Índice Vectorial:</span>
              <span className="font-mono text-zinc-800">{TECH_STACK_SPEC.aiAgent.vectorIndex}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Estrategia RAG:</span>
              <span className="text-zinc-700">{TECH_STACK_SPEC.aiAgent.ragMethod}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Auditoría de Costo:</span>
              <span className="text-zinc-700">{TECH_STACK_SPEC.aiAgent.tokenLogging}</span>
            </div>
            <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-200/80 text-[11px] text-purple-950">
              <strong>Control Humano (Handoff):</strong> {TECH_STACK_SPEC.aiAgent.humanHandoff}
            </div>
          </div>
        </div>

        {/* 4. WhatsApp Cloud API & Tiempo Real */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900">4. Mensajería & WebSockets</h3>
                <p className="text-[11px] text-zinc-500">WhatsApp oficial y Pusher en vivo</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              Meta API + Pusher
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">API de WhatsApp:</span>
              <strong className="text-zinc-900">{TECH_STACK_SPEC.communications.whatsapp}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Sincronización Tiempo Real:</span>
              <strong className="text-amber-700 font-semibold">{TECH_STACK_SPEC.communications.websockets}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Buzón de Correo Entrante:</span>
              <span className="text-zinc-700">{TECH_STACK_SPEC.communications.emailIncoming}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Servidor Correo Saliente:</span>
              <span className="text-zinc-700">{TECH_STACK_SPEC.communications.emailOutgoing}</span>
            </div>
            <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 text-[11px] text-zinc-700">
              <strong>Webhooks:</strong> Escucha en el endpoint <code className="font-mono bg-white px-1 py-0.5 rounded border border-zinc-200 text-red-600">/api/whatsapp/webhook</code> con verificación de token estricta.
            </div>
          </div>
        </div>
      </div>

      {/* Tabla Exhaustiva de Versiones de Paquetes (NPM) */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-base font-extrabold text-zinc-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-red-500" />
              Catálogo de Paquetes & Versiones Instaladas (package.json)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Dependencias exactas que compilan y dan vida a la plataforma
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={packageSearch}
                onChange={(e) => setPackageSearch(e.target.value)}
                placeholder="Buscar paquete..."
                className="pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500 text-zinc-700"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "Todas las Categorías" : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-100 text-zinc-700 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Paquete NPM</th>
                <th className="py-2.5 px-3">Versión</th>
                <th className="py-2.5 px-3">Categoría</th>
                <th className="py-2.5 px-3">Función Técnica en Laser Inova</th>
                <th className="py-2.5 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredPackages.map((pkg) => (
                <tr key={pkg.name} className="hover:bg-zinc-50/80 transition-colors">
                  <td className="py-2 px-3 font-mono font-bold text-zinc-900 whitespace-nowrap">
                    {pkg.name}
                  </td>
                  <td className="py-2 px-3 font-mono text-red-600 font-semibold whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-red-50 border border-red-100 text-[11px]">
                      {pkg.version}
                    </span>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-medium border border-zinc-200">
                      {pkg.category}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-zinc-600">
                    {pkg.purpose}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => handleCopy(`"${pkg.name}": "${pkg.version}"`, pkg.name)}
                      className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                      title="Copiar dependencia"
                    >
                      {copiedKey === pkg.name ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
