"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Settings2, Scissors, Layers, CheckSquare, Camera, Sliders, Info } from "lucide-react";
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
  { id: "PLOTTER", name: "Plotter" },
  { id: "CAMA_PLANA", name: "Cama Plana" },
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

      {/* Cuidados e Instrucciones Especiales según la máquina activa */}
      {activeTab === "PLOTTER" && (
        <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/80 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-600/10 text-blue-600 rounded-xl">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">Protocolo de Cuidado y Notas de Configuración (Plotter)</h3>
              <p className="text-[11px] text-slate-700 mt-1 font-semibold leading-relaxed">
                Antes de iniciar cualquier producción en el plotter de corte/impresión, sigue estas recomendaciones obligatorias:
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-[11px] font-bold text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                  Limpiar rodillos de arrastre semanalmente para evitar acumulación de adhesivo.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                  Validar que la cuchilla no tenga residuos de vinil o lona atorados en el cabezal.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                  Regular la exposición de la cuchilla (debe sobresalir el equivalente a una tarjeta de crédito).
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                  <strong>Realizar siempre un corte de prueba (Test Cut)</strong> antes de mandar todo el rollo.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === "CAMA_PLANA" && (
        <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/80 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-600/10 text-blue-600 rounded-xl">
              <Camera className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">Rutina Diaria de Cuidado y Calibración (Cama Plana UV)</h3>
              <p className="text-[11px] text-slate-700 mt-1 font-semibold leading-relaxed">
                Este equipo requiere mantenimiento de precisión constante para evitar daños en los cabezales UV:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <div className="bg-white/95 p-3 rounded-xl border border-blue-100 shadow-sm">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-1">1. Limpieza y Test Diario</span>
                  <p className="text-[10px] font-bold text-slate-700 leading-normal">
                    Hacer Head Cleaning al encender. Imprimir un <strong>Nozzle Check</strong> (patrón de prueba) y validar que no falte ninguna línea.
                  </p>
                </div>
                <div className="bg-white/95 p-3 rounded-xl border border-blue-100 shadow-sm">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-1">2. Escáner y Cámara UV</span>
                  <p className="text-[10px] font-bold text-slate-700 leading-normal">
                    Limpiar el lente de la cámara y cristal del escáner con alcohol isopropílico. Validar la calibración de registro en el software de control.
                  </p>
                </div>
                <div className="bg-white/95 p-3 rounded-xl border border-blue-100 shadow-sm">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-1">3. Altura de Seguridad</span>
                  <p className="text-[10px] font-bold text-slate-700 leading-normal">
                    Usar siempre el sensor automático de altura (Auto-height) para evitar que los cabezales golpeen o raspen el material base.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

                {activeTab === "PLOTTER" ? (
                  <>
                    <div className="col-span-full mt-2">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded">Parámetros del Plotter</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Velocidad de Corte (mm/s)</label>
                      <input type="number" step="1" name="cutSpeed" required placeholder="Ej. 150" className="w-full text-sm font-bold border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Presión / Fuerza (g)</label>
                      <input type="number" step="1" name="cutPower" required placeholder="Ej. 80" className="w-full text-sm font-bold border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tipo de Cuchilla / Ángulo</label>
                      <select name="waveType" className="w-full text-sm font-bold border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all cursor-pointer">
                        <option value="Cuchilla de 45°">Cuchilla de 45° (Normal)</option>
                        <option value="Cuchilla de 60°">Cuchilla de 60° (Grosor/Detalle)</option>
                        <option value="Cuchilla de 30°">Cuchilla de 30° (Vinil Delgado)</option>
                        <option value="Otro / Bolígrafo">Otro / Bolígrafo</option>
                      </select>
                    </div>
                  </>
                ) : activeTab === "CAMA_PLANA" ? (
                  <>
                    <div className="col-span-full mt-2">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded">Configuración de Impresión UV</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tipo de Barniz</label>
                      <select name="waveType" className="w-full text-sm font-bold border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all cursor-pointer">
                        <option value="Ninguno">Ninguno</option>
                        <option value="Brillante (Gloss)">Brillante (Gloss)</option>
                        <option value="Mate (Matte)">Mate (Matte)</option>
                        <option value="Efecto 3D / Emboss">Efecto 3D / Emboss (Relieve)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Saturación de Color (%)</label>
                      <input type="number" name="engravePower" placeholder="Ej. 100" required className="w-full text-sm font-bold border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Saturación de Barniz (%)</label>
                      <input type="number" name="cutPower" placeholder="Ej. 60" className="w-full text-sm font-bold border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Resolución (DPI)</label>
                      <input type="number" name="engraveFrequency" placeholder="Ej. 720" className="w-full text-sm font-bold border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all" />
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}

                <div className="col-span-full">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    {activeTab === "CAMA_PLANA" ? "Notas de Calibración de Cámara / Escáner / Curado" : "Notas / Observaciones de Configuración"}
                  </label>
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
                
                {activeTab === "PLOTTER" ? (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black text-blue-500 uppercase tracking-widest text-center">Config. Corte (Vel / Presión)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-orange-400 uppercase tracking-widest text-center">Tipo de Cuchilla</th>
                  </>
                ) : activeTab === "CAMA_PLANA" ? (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black text-blue-400 uppercase tracking-widest text-center font-bold">Impresión UV (Saturación Color / Barniz)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-purple-400 uppercase tracking-widest text-center font-bold">Tipo de Barniz</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black text-red-400 uppercase tracking-widest text-center">Corte (Vel / Pot)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-blue-400 uppercase tracking-widest text-center">Grabado (Vel / Pot)</th>
                  </>
                )}
                
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Notas</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-r-xl text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProcesses.map((process) => (
                <tr key={process.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors">{process.material}</span>
                  </td>
                  
                  {activeTab === "PLOTTER" ? (
                    <>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-black text-gray-900 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100/50 w-fit">
                            {process.cutSpeed || '0'}<span className="text-[10px] text-blue-500 ml-0.5">mm/s</span> / {process.cutPower || '0'}<span className="text-[10px] text-blue-500">g</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">
                          {process.waveType || 'Cuchilla de 45°'}
                        </span>
                      </td>
                    </>
                  ) : activeTab === "CAMA_PLANA" ? (
                    <>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-black text-gray-900 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100/50 w-fit">
                            {process.engravePower || '100'}<span className="text-[10px] text-blue-400 ml-0.5">% Color</span> / {process.cutPower || '0'}<span className="text-[10px] text-blue-400">% Barniz</span>
                            {process.engraveFrequency ? <span className="text-[9px] text-gray-400 block text-center font-bold mt-0.5">{process.engraveFrequency} DPI</span> : null}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                          {process.waveType || 'Ninguno'}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                  
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
                  <td colSpan={activeTab === "PLOTTER" || activeTab === "CAMA_PLANA" ? 5 : 5} className="px-6 py-24 text-center">
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
