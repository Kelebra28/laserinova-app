"use client";

import React, { useState } from "react";
import { 
  PROCESS_FLOWS, 
  ProcessFlow, 
  ProcessFlowNode 
} from "@/constants/analytics.constants";
import { 
  Users, 
  FileText, 
  CheckCircle, 
  Receipt, 
  Cpu, 
  Star, 
  MessageCircle, 
  Bot, 
  DollarSign, 
  TrendingUp, 
  FileSpreadsheet, 
  Banknote, 
  PieChart, 
  ArrowRight, 
  ArrowDown, 
  Database, 
  Sparkles, 
  Info,
  GitBranch,
  Copy,
  Check,
  Code2,
  LayoutGrid,
  HelpCircle,
  XCircle
} from "lucide-react";

// Mapeo seguro de íconos
const iconMap: Record<string, React.ElementType> = {
  Users,
  FileText,
  CheckCircle,
  Receipt,
  Cpu,
  Star,
  MessageCircle,
  Bot,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Banknote,
  PieChart,
};

export function DataFlowDiagrams() {
  const [selectedFlowId, setSelectedFlowId] = useState<string>(PROCESS_FLOWS[0].id);
  const [activeNodeId, setActiveNodeId] = useState<string>(PROCESS_FLOWS[0].nodes[0].id);
  const [viewMode, setViewMode] = useState<"flowchart" | "mermaid" | "cards">("flowchart");
  const [copiedMermaid, setCopiedMermaid] = useState(false);

  const currentFlow = PROCESS_FLOWS.find((f) => f.id === selectedFlowId) || PROCESS_FLOWS[0];
  const currentNode = currentFlow.nodes.find((n) => n.id === activeNodeId) || currentFlow.nodes[0];

  const handleSelectFlow = (flowId: string) => {
    setSelectedFlowId(flowId);
    const flow = PROCESS_FLOWS.find((f) => f.id === flowId);
    if (flow && flow.nodes.length > 0) {
      setActiveNodeId(flow.nodes[0].id);
    }
  };

  const handleCopyMermaid = () => {
    navigator.clipboard.writeText(currentFlow.mermaidCode);
    setCopiedMermaid(true);
    setTimeout(() => setCopiedMermaid(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Selector de Flujos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div className="flex flex-wrap gap-2">
          {PROCESS_FLOWS.map((flow) => {
            const isSelected = flow.id === selectedFlowId;
            return (
              <button
                key={flow.id}
                onClick={() => handleSelectFlow(flow.id)}
                className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 border ${
                  isSelected
                    ? "bg-zinc-900 text-white border-zinc-800 shadow-md scale-[1.02]"
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <GitBranch className={`w-4 h-4 ${isSelected ? "text-red-400" : "text-zinc-400"}`} />
                {flow.title}
              </button>
            );
          })}
        </div>

        {/* Selector de Modo de Vista */}
        <div className="inline-flex items-center rounded-xl border border-zinc-200 bg-white p-1 self-start sm:self-auto">
          <button
            onClick={() => setViewMode("flowchart")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "flowchart"
                ? "bg-red-600 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Diagrama Visual
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "cards"
                ? "bg-red-600 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Paso a Paso
          </button>
          <button
            onClick={() => setViewMode("mermaid")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "mermaid"
                ? "bg-red-600 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Código Mermaid
          </button>
        </div>
      </div>

      {/* Encabezado del Flujo Activo */}
      <div className="bg-gradient-to-r from-red-50/70 via-zinc-50 to-white p-5 rounded-2xl border border-red-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider">
            {currentFlow.subtitle}
          </span>
          <h2 className="text-xl font-extrabold text-zinc-900 mt-0.5">{currentFlow.title}</h2>
          <p className="text-xs text-zinc-600 mt-1 max-w-3xl leading-relaxed">
            {currentFlow.description}
          </p>
        </div>
        <div className="shrink-0 bg-white px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 flex items-center gap-2">
          <Database className="w-4 h-4 text-red-500" />
          <span>{currentFlow.nodes.length} Etapas del Proceso</span>
        </div>
      </div>

      {/* VISTA 1: DIAGRAMA VISUAL FLOWCHART (Con Nodos, Conexiones y Decisiones) */}
      {viewMode === "flowchart" && (
        <div className="bg-zinc-900 text-white p-6 md:p-8 rounded-2xl border border-zinc-800 shadow-xl space-y-8">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Diagrama de Flujo Lógico con Ramificaciones & Decisiones</span>
            </div>
            <span className="text-[11px] text-zinc-400">
              Haz clic en cualquier nodo para ver sus tablas y columnas
            </span>
          </div>

          {/* Renderizado específico por tipo de flujo */}
          {selectedFlowId === "commercial-industrial" && (
            <div className="space-y-6">
              {/* Nodos 1 y 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {/* Paso 1 */}
                <div 
                  onClick={() => setActiveNodeId("step-lead")}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    activeNodeId === "step-lead" 
                      ? "bg-zinc-800 border-red-500 shadow-lg ring-1 ring-red-500" 
                      : "bg-zinc-800/60 border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-red-400 uppercase">1. Entrada</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-700 text-zinc-300 font-mono">Client + WhatsAppContact</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">Prospección / Alta de Cliente</h4>
                  <p className="text-xs text-zinc-400 mt-1">El usuario contacta por WhatsApp o mostrador. Se da de alta en la entidad Client.</p>
                </div>

                {/* Paso 2 */}
                <div 
                  onClick={() => setActiveNodeId("step-quote")}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    activeNodeId === "step-quote" 
                      ? "bg-zinc-800 border-red-500 shadow-lg ring-1 ring-red-500" 
                      : "bg-zinc-800/60 border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase">2. Costeo</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-700 text-zinc-300 font-mono">Quote + QuoteConcept</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">Cotización & Algoritmo de Corte</h4>
                  <p className="text-xs text-zinc-400 mt-1">Cálculo de tiempos de láser (min), cm² de placa, mano de obra y precio unitario.</p>
                </div>
              </div>

              {/* Flecha hacia decisión */}
              <div className="flex justify-center">
                <ArrowDown className="w-6 h-6 text-zinc-500 animate-bounce" />
              </div>

              {/* Rombo / Diamante de Decisión Comercial */}
              <div className="max-w-md mx-auto bg-gradient-to-r from-zinc-800 via-zinc-850 to-zinc-800 border-2 border-amber-500/50 p-4 rounded-2xl text-center shadow-lg">
                <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Punto de Decisión</div>
                <h4 className="text-sm font-extrabold text-white mt-0.5">¿El Cliente Aprueba la Cotización?</h4>
                <div className="mt-3 flex items-center justify-center gap-4 text-xs font-bold">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ✓ SÍ (status = APPROVED)
                  </span>
                  <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                    ✕ NO (status = REJECTED)
                  </span>
                </div>
              </div>

              {/* Flecha hacia abajo */}
              <div className="flex justify-center">
                <ArrowDown className="w-6 h-6 text-zinc-500" />
              </div>

              {/* Nodos 3, 4, 5 y 6 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Paso 3 */}
                <div 
                  onClick={() => setActiveNodeId("step-negotiation")}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    activeNodeId === "step-negotiation" 
                      ? "bg-zinc-800 border-red-500 shadow-lg ring-1 ring-red-500" 
                      : "bg-zinc-800/60 border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <span className="text-[10px] font-bold text-blue-400 uppercase">3. Aprobación</span>
                  <h4 className="text-xs font-bold text-white mt-1">PaymentRequest</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">Vendedor solicita cobro formal de anticipo a administración.</p>
                  <div className="mt-2 text-[10px] font-mono text-zinc-500">status: PENDING</div>
                </div>

                {/* Paso 4 */}
                <div 
                  onClick={() => setActiveNodeId("step-advance")}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    activeNodeId === "step-advance" 
                      ? "bg-zinc-800 border-red-500 shadow-lg ring-1 ring-red-500" 
                      : "bg-zinc-800/60 border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">4. Anticipo</span>
                  <h4 className="text-xs font-bold text-white mt-1">Receipt & Finanzas</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">Emisión de recibo foliado y registro en FinancialTransaction.</p>
                  <div className="mt-2 text-[10px] font-mono text-emerald-400">paymentStatus: PARTIAL</div>
                </div>

                {/* Paso 5 */}
                <div 
                  onClick={() => setActiveNodeId("step-production")}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    activeNodeId === "step-production" 
                      ? "bg-zinc-800 border-red-500 shadow-lg ring-1 ring-red-500" 
                      : "bg-zinc-800/60 border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <span className="text-[10px] font-bold text-purple-400 uppercase">5. Taller Láser</span>
                  <h4 className="text-xs font-bold text-white mt-1">Task Kanban & Recetas</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">Producción en máquinas, corte, grabado y deducción de stock.</p>
                  <div className="mt-2 text-[10px] font-mono text-purple-400">status: IN_PRODUCTION</div>
                </div>

                {/* Paso 6 */}
                <div 
                  onClick={() => setActiveNodeId("step-delivery-survey")}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    activeNodeId === "step-delivery-survey" 
                      ? "bg-zinc-800 border-red-500 shadow-lg ring-1 ring-red-500" 
                      : "bg-zinc-800/60 border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <span className="text-[10px] font-bold text-teal-400 uppercase">6. Entrega & NPS</span>
                  <h4 className="text-xs font-bold text-white mt-1">SurveyResponse</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">Cobro de saldo remanente, entrega física y encuesta de 1 a 5.</p>
                  <div className="mt-2 text-[10px] font-mono text-teal-400">status: DELIVERED</div>
                </div>
              </div>
            </div>
          )}

          {/* Renderizado para WhatsApp & Agente IA */}
          {selectedFlowId === "whatsapp-ai-flow" && (
            <div className="space-y-6">
              {/* Entrada del Mensaje */}
              <div 
                onClick={() => setActiveNodeId("wa-inbound")}
                className="max-w-md mx-auto cursor-pointer p-4 rounded-xl bg-zinc-800 border border-zinc-700 text-center"
              >
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Entrada de Chat</span>
                <h4 className="text-sm font-bold text-white mt-0.5">1. Mensaje WhatsApp (Webhook de Meta)</h4>
                <p className="text-xs text-zinc-400 mt-1">direction: INBOUND registrado en WhatsAppMessage</p>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-6 h-6 text-zinc-500" />
              </div>

              {/* Decisión de BotMode */}
              <div className="max-w-md mx-auto bg-zinc-800 border-2 border-purple-500/50 p-4 rounded-2xl text-center shadow-lg">
                <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Condición del Contacto</div>
                <h4 className="text-sm font-extrabold text-white mt-0.5">¿WhatsAppContact.botMode == true?</h4>
                <div className="mt-3 flex items-center justify-center gap-4 text-xs font-bold">
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    SÍ ➔ Modo IA Autónomo
                  </span>
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    NO ➔ Atención Vendedor Humano
                  </span>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-6 h-6 text-zinc-500" />
              </div>

              {/* Flujo de IA RAG */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <div 
                  onClick={() => setActiveNodeId("wa-ai-engine")}
                  className="cursor-pointer p-4 rounded-xl bg-zinc-800/80 border border-zinc-700 hover:border-purple-500 transition-all"
                >
                  <span className="text-[10px] font-bold text-purple-400 uppercase">2. RAG & Razonamiento</span>
                  <h4 className="text-xs font-bold text-white mt-1">Pinecone + Google Gemini</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">Consulta embeddings del catálogo y tabla AgentRule para responder con precisión.</p>
                </div>

                <div 
                  onClick={() => setActiveNodeId("wa-token-audit")}
                  className="cursor-pointer p-4 rounded-xl bg-zinc-800/80 border border-zinc-700 hover:border-blue-500 transition-all"
                >
                  <span className="text-[10px] font-bold text-blue-400 uppercase">3. Auditoría Inmutable</span>
                  <h4 className="text-xs font-bold text-white mt-1">AiUsageLog (Tokens & USD)</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">Registra inputTokens, outputTokens y costo estimado en USD de la inferencia.</p>
                </div>

                <div 
                  onClick={() => setActiveNodeId("wa-quote-link")}
                  className="cursor-pointer p-4 rounded-xl bg-zinc-800/80 border border-zinc-700 hover:border-emerald-500 transition-all"
                >
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">4. Conversión Comercial</span>
                  <h4 className="text-xs font-bold text-white mt-1">Quote Originada</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">Se asocia el contacto al cliente y se genera la cotización con contactId.</p>
                </div>
              </div>
            </div>
          )}

          {/* Renderizado para P&L Financiero */}
          {selectedFlowId === "financial-pnl-flow" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  onClick={() => setActiveNodeId("fin-projected")}
                  className="p-4 rounded-xl bg-zinc-800 border border-zinc-700 cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-blue-400 uppercase">1. En Papel (Presupuesto)</span>
                  <h4 className="text-xs font-bold text-white mt-1">Quote (Total & Utilidad Estimada)</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">subtotal + tax = total. estimatedUtility proyectada.</p>
                </div>

                <div 
                  onClick={() => setActiveNodeId("fin-cashin")}
                  className="p-4 rounded-xl bg-zinc-800 border border-zinc-700 cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">2. Entrada Real (Cash In)</span>
                  <h4 className="text-xs font-bold text-white mt-1">Cobranza Real en Banco / Caja</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">FinancialTransaction tipo ANTICIPO o LIQUIDACION.</p>
                </div>

                <div 
                  onClick={() => setActiveNodeId("fin-cashout")}
                  className="p-4 rounded-xl bg-zinc-800 border border-zinc-700 cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-red-400 uppercase">3. Salida Real (Cash Out)</span>
                  <h4 className="text-xs font-bold text-white mt-1">Gastos Comprobados de Proyecto</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">Compras a proveedores de placas vinculadas al quoteId.</p>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-6 h-6 text-zinc-500" />
              </div>

              {/* Caja de Conciliación Final */}
              <div 
                onClick={() => setActiveNodeId("fin-real-margin")}
                className="max-w-xl mx-auto p-5 rounded-2xl bg-gradient-to-r from-zinc-800 via-zinc-850 to-zinc-800 border-2 border-emerald-500/40 text-center cursor-pointer shadow-lg"
              >
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Cierre Contable Final</span>
                <h4 className="text-sm font-extrabold text-white mt-1">4. Utilidad Neta Real & Auditoría de Varianza</h4>
                <div className="font-mono text-xs text-zinc-300 bg-black/40 p-2.5 rounded-lg border border-white/10 mt-2">
                  Quote.realUtilityTotal = realAmountCollected - SUM(GASTO_PROYECTO)
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Permite conocer la discrepancia exacta entre lo estimado por el cotizador y la ganancia líquida final.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: CÓDIGO MERMAID (Para exportar y copiar) */}
      {viewMode === "mermaid" && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-red-500" />
                Código Mermaid para Herramientas Externas
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Copia y pega este código en <strong>Mermaid Live Editor</strong>, <strong>Notion</strong>, <strong>Obsidian</strong> o <strong>Draw.io</strong> para renderizar el diagrama de flujo interactivo en cualquier plataforma.
              </p>
            </div>
            <button
              onClick={handleCopyMermaid}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm"
            >
              {copiedMermaid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedMermaid ? "¡Copiado!" : "Copiar Mermaid"}
            </button>
          </div>

          <div className="rounded-xl overflow-hidden border border-zinc-800 bg-[#1e1e1e] p-4 text-xs font-mono text-zinc-200 overflow-x-auto">
            <pre className="leading-relaxed whitespace-pre">{currentFlow.mermaidCode}</pre>
          </div>
        </div>
      )}

      {/* VISTA 3: PASO A PASO (Cards Horizontales Detalladas) */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentFlow.nodes.map((node, index) => {
            const Icon = iconMap[node.iconName] || FileText;
            const isSelected = node.id === currentNode.id;

            return (
              <div
                key={node.id}
                onClick={() => setActiveNodeId(node.id)}
                className={`cursor-pointer rounded-2xl p-5 border transition-all ${
                  isSelected
                    ? "bg-zinc-900 text-white border-red-500 shadow-md ring-1 ring-red-500"
                    : "bg-white text-zinc-800 border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      isSelected ? "bg-red-500/20 text-red-400" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {node.role}
                  </span>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                      isSelected ? "bg-red-500 text-white" : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {index + 1}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      isSelected ? "bg-white/10 text-red-400" : "bg-red-50 text-red-600"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${isSelected ? "text-white" : "text-zinc-900"}`}>
                      {node.title}
                    </h4>
                    <p className={`text-xs mt-1 leading-relaxed ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>
                      {node.summary}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-200/40 flex flex-wrap gap-1">
                  {node.modelsInvolved.map((m) => (
                    <span
                      key={m}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        isSelected ? "bg-white/10 text-zinc-300" : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ficha de Detalle Técnico del Nodo Seleccionado */}
      {currentNode && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">
                  Etapa Activa
                </span>
                <span className="text-xs text-zinc-500">
                  Responsable: <strong className="text-zinc-800">{currentNode.role}</strong>
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-zinc-900 mt-1">
                {currentNode.title}
              </h3>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2 flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 text-red-600 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-red-600 tracking-wider">
                  KPI Impactado
                </div>
                <div className="text-xs font-semibold text-zinc-900">
                  {currentNode.kpiGenerated}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="md:col-span-2 space-y-3">
              <p className="text-zinc-700 leading-relaxed bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                {currentNode.summary}
              </p>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                  Modelos de Base de Datos Vinculados:
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentNode.modelsInvolved.map((model) => (
                    <span
                      key={model}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 text-white font-mono font-medium"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      {model}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                Campos Clave para Consultar:
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                {currentNode.keyDataPoints.map((field) => (
                  <div
                    key={field}
                    className="flex items-center justify-between font-mono bg-white px-2 py-1 rounded border border-zinc-200 text-zinc-800"
                  >
                    <span>{field}</span>
                    <span className="text-[9px] text-zinc-400">campo</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
