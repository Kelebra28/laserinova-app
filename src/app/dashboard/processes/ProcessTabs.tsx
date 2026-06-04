"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Settings2, Search } from "lucide-react";
import { createProcessAction, deleteProcessAction } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";
import MaterialRecipeSelector from "@/components/processes/MaterialRecipeSelector";
import SearchInput from "@/components/ui/SearchInput";
import ProjectRecipeList from "./ProjectRecipeList";
import ProjectRecipeForm from "./ProjectRecipeForm";

const MACHINES = [
  { id: "FIBRA", name: "Fibra Óptica" },
  { id: "CO2", name: "CO2" },
  { id: "UV", name: "UV" },
  { id: "XTOOL", name: "xTool" },
];

export default function ProcessTabs({ 
  initialProcesses,
  projectRecipes = [],
  materials 
}: { 
  initialProcesses: any[],
  projectRecipes?: any[],
  materials: { category: { name: string }, thickness: number | null }[]
}) {
  const [activeTab, setActiveTab] = useState("FIBRA");
  const [isAdding, setIsAdding] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Group materials by Category Name + Thickness for the select
  const materialOptions = useMemo(() => {
    const optionsMap = new Map();
    materials.forEach(m => {
      const label = `${m.category.name}${m.thickness ? ` ${m.thickness}mm` : ""}`;
      if (!optionsMap.has(label)) {
        optionsMap.set(label, { label, category: m.category.name });
      }
    });
    return Array.from(optionsMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [materials]);

  const filteredProcesses = useMemo(() => {
    return initialProcesses
      .filter(p => p.machineName === activeTab)
      .filter(p => p.material.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [initialProcesses, activeTab, searchQuery]);

  return (
    <div>
      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-100 mb-6 overflow-x-auto">
        {MACHINES.map((machine) => (
          <button
            key={machine.id}
            onClick={() => {
              setActiveTab(machine.id);
              setIsAdding(false);
              setEditingProject(null);
              setSearchQuery("");
            }}
            className={`px-4 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors ${
              activeTab === machine.id
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
            }`}
          >
            {machine.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">
            Recetas de {MACHINES.find(m => m.id === activeTab)?.name}
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
            {filteredProcesses.length} RECETAS ENCONTRADAS
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <SearchInput 
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar por material..."
            />
          </div>
          <button
            onClick={() => { setIsAdding(!isAdding); setEditingProject(null); }}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95 shrink-0"
          >
            {isAdding || editingProject ? "Cancelar" : <><Plus className="h-4 w-4" /> Nueva Receta</>}
          </button>
        </div>
      </div>

      {(isAdding || editingProject) && (
        activeTab === "FIBRA" || activeTab === "UV" ? (
          <ProjectRecipeForm 
            machineName={activeTab} 
            initialData={editingProject}
            onClose={() => { setIsAdding(false); setEditingProject(null); }} 
          />
        ) : (
          <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-top-4 duration-300">
            <form action={async (formData) => {
              const data = {
                machineName: activeTab,
                material: selectedMaterial,
                engravePower: formData.get("engravePower") ? Number(formData.get("engravePower")) : undefined,
                engraveSpeed: formData.get("engraveSpeed") ? Number(formData.get("engraveSpeed")) : undefined,
                engraveFrequency: formData.get("engraveFrequency") ? Number(formData.get("engraveFrequency")) : undefined,
                waveType: formData.get("waveType") as string,
                cutPower: formData.get("cutPower") ? Number(formData.get("cutPower")) : undefined,
                cutSpeed: formData.get("cutSpeed") ? Number(formData.get("cutSpeed")) : undefined,
                notes: formData.get("notes") as string,
              };
              await createProcessAction(data);
              setIsAdding(false);
              setSelectedMaterial("");
            }} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="col-span-full md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Material Base (Grosor)</label>
                  <MaterialRecipeSelector 
                    options={materialOptions}
                    value={selectedMaterial}
                    onChange={setSelectedMaterial}
                  />
                  <input type="hidden" name="material" value={selectedMaterial} required />
                </div>

                <div className="col-span-full mt-2"><span className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2 py-1 rounded">Parámetros de Corte</span></div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vel. Corte (mm/s)</label>
                  <input type="number" step="0.1" name="cutSpeed" className="w-full text-sm font-bold border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pot. Corte (%)</label>
                  <input type="number" step="0.1" name="cutPower" className="w-full text-sm font-bold border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all" />
                </div>

                <div className="col-span-full mt-2"><span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded">Parámetros de Grabado</span></div>
                
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Velocidad (mm/s)</label>
                  <input type="number" step="0.1" name="engraveSpeed" required className="w-full text-sm font-bold border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Potencia (%)</label>
                  <input type="number" step="0.1" name="engravePower" required className="w-full text-sm font-bold border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all" />
                </div>

                <div className="col-span-full">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Notas / Observaciones</label>
                  <input type="text" name="notes" className="w-full text-sm font-medium border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-red-600/20 focus:border-red-600" />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <SubmitButton className="bg-red-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95">
                  Guardar Receta
                </SubmitButton>
              </div>
            </form>
          </div>
        )
      )}

      {/* List */}
      {activeTab === "FIBRA" || activeTab === "UV" ? (
        <ProjectRecipeList 
          projectRecipes={projectRecipes.filter(p => p.machineName === activeTab)} 
          searchQuery={searchQuery}
          onEdit={(project) => setEditingProject(project)}
          onDelete={() => {}} // Will be handled by refresh in component
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-l-xl">Material</th>
                <th className="px-6 py-4 text-[10px] font-black text-red-400 uppercase tracking-widest text-center">Corte (Vel / Pot)</th>
                <th className="px-6 py-4 text-[10px] font-black text-blue-400 uppercase tracking-widest text-center">Grabado (Vel / Pot)</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Notas</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-r-xl text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProcesses.map((process) => (
                <tr key={process.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-gray-900 group-hover:text-red-600 transition-colors">{process.material}</span>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black text-gray-900 bg-red-50/50 px-3 py-1.5 rounded-xl border border-red-100/50 w-fit">
                        {process.cutSpeed || '0'}<span className="text-[10px] text-red-400 ml-0.5">ms</span> / {process.cutPower || '0'}<span className="text-[10px] text-red-400">%</span>
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black text-gray-900 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100/50 w-fit">
                        {process.engraveSpeed || '0'}<span className="text-[10px] text-blue-400 ml-0.5">ms</span> / {process.engravePower || '0'}<span className="text-[10px] text-blue-400">%</span>
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 text-[11px] font-medium text-gray-400 max-w-xs truncate" title={process.notes}>
                    {process.notes || '-'}
                  </td>
                  
                  <td className="px-6 py-4 text-right">
                    <form action={deleteProcessAction}>
                      <input type="hidden" name="id" value={process.id} />
                      <button className="p-2.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-90 group/del">
                        <Trash2 className="h-4 w-4 transition-transform group-hover/del:scale-110" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {filteredProcesses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <Settings2 className="h-8 w-8 text-gray-200 mx-auto mb-4 animate-spin-slow" />
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">No se encontraron recetas</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
