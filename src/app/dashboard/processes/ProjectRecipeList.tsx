"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Settings2, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProjectRecipeList({
  projectRecipes,
  searchQuery,
  onEdit,
  onDelete
}: {
  projectRecipes: any[];
  searchQuery: string;
  onEdit: (project: any) => void;
  onDelete: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();

  const filtered = projectRecipes.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este proyecto/receta?")) return;
    try {
      await fetch(`/api/project-recipes/${id}`, { method: 'DELETE' });
      onDelete(id);
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  if (filtered.length === 0) {
    return (
      <div className="py-24 text-center border-t border-gray-100 mt-6">
        <Settings2 className="h-8 w-8 text-gray-200 mx-auto mb-4 animate-spin-slow" />
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">No se encontraron proyectos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      {filtered.map((project) => (
        <div key={project.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden transition-all hover:border-gray-200 hover:shadow-sm">
          {/* Header Row */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50"
            onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-xl ${expandedId === project.id ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
                {expandedId === project.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">{project.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{project.steps.length} PASOS</p>
                  {project.rotaryDiameter && (
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">
                      Rotativo: {project.rotaryDiameter}mm
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <p className="text-[11px] font-medium text-gray-400 max-w-[200px] truncate hidden md:block" title={project.notes}>
                {project.notes || '-'}
              </p>
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(project); }}
                  className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-90"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                  className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          {expandedId === project.id && (
            <div className="bg-gray-50 border-t border-gray-100 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.steps.map((step: any, index: number) => (
                  <div key={step.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Paso {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-900 uppercase">{step.name}</span>
                        {step.passesCount && step.passesCount > 1 && (
                          <span className="text-[9px] font-bold text-gray-500 uppercase bg-gray-100 px-1.5 py-0.5 rounded">
                            {step.passesCount}x Pasadas
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Poder</span>
                        <span className="text-xs font-black text-red-600">{step.power || '-'}%</span>
                      </div>
                      <div className="flex justify-between items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Velocidad</span>
                        <span className="text-xs font-black text-blue-600">{step.speed || '-'}</span>
                      </div>
                      {step.frequency && (
                        <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Frecuencia</span>
                          <span className="text-xs font-bold text-gray-900">{step.frequency}</span>
                        </div>
                      )}
                      
                      {step.hatchLineSpacing && (
                        <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Line Spacing</span>
                          <span className="text-xs font-bold text-gray-900">{step.hatchLineSpacing}</span>
                        </div>
                      )}

                      {step.hatchAngle && (
                        <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ángulo</span>
                          <span className="text-xs font-bold text-gray-900">{step.hatchAngle}°</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
