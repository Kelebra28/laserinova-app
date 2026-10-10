"use client";

import { useState } from "react";
import { BrainCircuit, Search, Database, Bot, FileText, CheckCircle2, X, Loader2, Edit2, Power } from "lucide-react";
import { createAgentRule, updateAgentRule, toggleAgentRule } from "@/server/actions/agent-rules.actions";

interface AgentRule {
  id: string;
  namespace: string;
  title: string | null;
  content: string;
  isVectorized: boolean;
  active: boolean;
  createdAt: Date;
}

interface KnowledgeClientProps {
  initialRules: any[];
}

export function KnowledgeClient({ initialRules }: KnowledgeClientProps) {
  const [rulesList, setRulesList] = useState(initialRules);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Estado del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ namespace: "general_rules", title: "", content: "" });
  const [errorMsg, setErrorMsg] = useState("");

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ namespace: "general_rules", title: "", content: "" });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const openEditModal = (rule: AgentRule) => {
    setEditingId(rule.id);
    setFormData({ namespace: rule.namespace, title: rule.title || "", content: rule.content });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setErrorMsg("");
    if (!formData.title || !formData.content) return setErrorMsg("Por favor llena el título y el contenido.");
    
    setIsSaving(true);
    const res = editingId 
      ? await updateAgentRule(editingId, formData)
      : await createAgentRule(formData);
    
    if (res.success) {
      if (editingId) {
        setRulesList(rulesList.map(r => r.id === editingId ? res.data : r));
      } else {
        setRulesList([res.data, ...rulesList]);
      }
      setIsModalOpen(false);
    } else {
      setErrorMsg("Error al guardar: " + res.error);
    }
    setIsSaving(false);
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    const res = await toggleAgentRule(id, !currentActive);
    if (res.success) {
      setRulesList(rulesList.map(r => r.id === id ? res.data : r));
    } else {
      console.error("Error cambiando estado:", res.error);
    }
  };

  // Limpiar namespaces raros y estandarizarlos
  const rawNamespaces = rulesList.map((r) => r.namespace).filter(Boolean);
  const uniqueNamespaces = Array.from(new Set(rawNamespaces)).sort();
  const namespaces = ["todos", ...uniqueNamespaces];

  const filteredRules = rulesList.filter((rule) => {
    const matchesSearch = 
      (rule.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
      (rule.content?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "todos" || rule.namespace === activeTab;
    
    return matchesSearch && matchesTab;
  });

  // Paginación
  const totalPages = Math.ceil(filteredRules.length / itemsPerPage);
  const paginatedRules = filteredRules.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Elegante */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-zinc-200 shrink-0">
                <BrainCircuit className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Cerebro de la IA</h1>
                <p className="text-zinc-500 text-sm mt-1">Gestión de conocimiento, RAG y políticas para los Agentes.</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <div className="bg-white border border-zinc-200 shadow-sm rounded-xl px-4 py-2 flex items-center gap-3">
              <Database className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Reglas en BD</p>
                <p className="text-sm font-bold text-zinc-800">{initialRules.length}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-200 flex items-center gap-2"
            >
              <Bot className="w-4 h-4" />
              Nueva Regla
            </button>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por título o contenido de la regla..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset page on search
              }}
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-zinc-400"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {namespaces.map((ns) => (
              <button
                key={ns}
                onClick={() => {
                  setActiveTab(ns);
                  setCurrentPage(1); // Reset page on filter
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  activeTab === ns 
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm" 
                    : "bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 border border-zinc-200"
                }`}
              >
                {ns === "todos" ? "Todos" : ns.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Reglas */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginatedRules.map((rule) => (
            <div 
              key={rule.id} 
              className="bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col gap-4 hover:shadow-lg hover:border-indigo-200 transition-all duration-300 group relative overflow-hidden h-[280px]"
            >
              {/* Etiqueta Namespace */}
              <div className="flex items-center justify-between shrink-0">
                <span className="bg-zinc-100 text-zinc-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider truncate max-w-[150px]">
                  {rule.namespace}
                </span>
                {rule.isVectorized && (
                  <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Vectorizado</span>
                  </div>
                )}
              </div>

              {/* Título y Contenido */}
              <div className="flex-1 overflow-hidden">
                <h3 className="text-base font-bold text-zinc-900 mb-2 flex items-start gap-2 line-clamp-2">
                  <FileText className="w-4 h-4 text-indigo-400 mt-1 shrink-0" />
                  {rule.title || "Regla sin título"}
                </h3>
                <p className="text-sm text-zinc-500 line-clamp-5 leading-relaxed">
                  {rule.content}
                </p>
              </div>

              {/* Footer de Tarjeta */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button 
                  onClick={() => openEditModal(rule)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
                <button 
                  onClick={() => handleToggle(rule.id, rule.active)}
                  className={`text-xs font-semibold flex items-center gap-1 ${
                    rule.active ? "text-red-500 hover:text-red-700" : "text-emerald-500 hover:text-emerald-700"
                  }`}
                >
                  <Power className="w-3 h-3" /> {rule.active ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          ))}

          {filteredRules.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-400">
              <Bot className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-zinc-500">No se encontraron reglas</p>
              <p className="text-sm">Intenta con otro filtro.</p>
            </div>
          )}
        </div>

        {/* Controles de Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              Anterior
            </button>
            <span className="text-sm font-medium text-zinc-500 px-4">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* MODAL PARA NUEVA REGLA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                {editingId ? "Editar regla de la IA" : "Enseñarle nueva regla a la IA"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                  {errorMsg}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Categoría (Namespace)</label>
                <select 
                  value={formData.namespace}
                  onChange={(e) => setFormData({...formData, namespace: e.target.value})}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                >
                  <option value="sales_policies">Políticas de Venta (sales_policies)</option>
                  <option value="material_rules">Reglas de Materiales (material_rules)</option>
                  <option value="product_protocols">Protocolos de Producto (product_protocols)</option>
                  <option value="general_rules">Comportamiento General (general_rules)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Título de la Regla</label>
                <input 
                  type="text" 
                  placeholder="Ej. Cobro extra por acrílico espejo"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Instrucción exacta para la IA</label>
                <textarea 
                  rows={8}
                  placeholder="Escribe exactamente lo que quieres que la IA sepa o haga..."
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200/50 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                {isSaving ? "Inyectando a Pinecone..." : (editingId ? "Actualizar Regla" : "Guardar e Inyectar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
