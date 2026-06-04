"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import SubmitButton from "@/components/ui/SubmitButton";
import StatusModal from "@/components/ui/StatusModal";

export default function ProjectRecipeForm({
  machineName,
  initialData,
  onClose
}: {
  machineName: string;
  initialData?: any;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name || "");
  const [rotaryDiameter, setRotaryDiameter] = useState(initialData?.rotaryDiameter || "");
  const [useRotary, setUseRotary] = useState(!!initialData?.rotaryDiameter);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });
  const [steps, setSteps] = useState<any[]>(
    initialData?.steps?.map((s: any) => ({ ...s, id: s.id || Date.now() + Math.random() })) || 
    [{ id: Date.now(), name: "Grabado", power: "", speed: "", frequency: "", passesCount: 1, hatchLineSpacing: "", hatchAngle: "" }]
  );

  const addStep = () => {
    setSteps([...steps, { id: Date.now(), name: "Nuevo Paso", power: "", speed: "", frequency: "", passesCount: 1, hatchLineSpacing: "", hatchAngle: "" }]);
  };

  const removeStep = (id: any) => {
    if (steps.length > 1) {
      setSteps(steps.filter((s: any) => s.id !== id));
    }
  };

  const updateStep = (id: any, field: string, value: string) => {
    setSteps(steps.map((step: any) => step.id === id ? { ...step, [field]: value } : step));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = initialData ? `/api/project-recipes/${initialData.id}` : '/api/project-recipes';
      const method = initialData ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          machineName,
          rotaryDiameter,
          notes,
          steps
        })
      });

      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        console.error("Error al guardar:", await res.text());
        setErrorModal({
          isOpen: true,
          title: "Error al guardar",
          message: "Hubo un problema al intentar guardar el proyecto. Por favor, revisa los datos."
        });
      }
    } catch (error) {
      console.error(error);
      setErrorModal({
        isOpen: true,
        title: "Error de red",
        message: "No se pudo conectar con el servidor."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-top-4 duration-300">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="col-span-full md:col-span-2 lg:col-span-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nombre del Proyecto</label>
            <input 
              type="text" 
              required
              placeholder="Ej. Termo Yeti 20oz"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm font-bold border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all" 
            />
            <div className="w-full md:w-1/3 mt-3">
              <label className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={useRotary} 
                  onChange={(e) => { 
                    setUseRotary(e.target.checked); 
                    if (!e.target.checked) setRotaryDiameter(""); 
                  }} 
                  className="rounded border-gray-300 text-red-600 focus:ring-red-600" 
                />
                USAR MOTOR ROTATIVO
              </label>
              {useRotary && (
                <input 
                  type="number"
                  placeholder="Diámetro (Ej. 70)"
                  value={rotaryDiameter}
                  onChange={(e) => setRotaryDiameter(e.target.value)}
                  className="w-full text-sm font-bold border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all placeholder:font-medium placeholder:text-gray-400" 
                />
              )}
            </div>
          </div>

          <div className="col-span-full lg:col-span-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Notas / Observaciones</label>
            <input 
              type="text" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm font-medium border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-red-600/20 focus:border-red-600" 
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
            <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Pasos del Proceso</span>
            <button 
              type="button" 
              onClick={addStep}
              className="flex items-center gap-1 text-[10px] font-black text-red-600 uppercase tracking-widest hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition-all"
            >
              <Plus className="h-3 w-3" /> Añadir Paso
            </button>
          </div>

          <div className="space-y-3">
            {steps.map((step: any, index: number) => (
              <div key={step.id} className="flex flex-col md:flex-row flex-wrap items-end gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative group">
                <div className="w-full md:flex-1 min-w-[120px]">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Paso</label>
                  <input 
                    type="text" 
                    required
                    value={step.name}
                    onChange={(e) => updateStep(step.id, "name", e.target.value)}
                    className="w-full text-xs font-bold border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-600/20 focus:border-red-600" 
                  />
                </div>
                <div className="w-full md:flex-1 min-w-[80px]">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Pasadas</label>
                  <input 
                    type="number" 
                    min="1"
                    value={step.passesCount || 1}
                    onChange={(e) => updateStep(step.id, "passesCount", e.target.value)}
                    className="w-full text-xs font-bold border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-600/20 focus:border-red-600" 
                  />
                </div>
                <div className="w-full md:flex-1 min-w-[80px]">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Poder %</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={step.power || ''}
                    onChange={(e) => updateStep(step.id, "power", e.target.value)}
                    className="w-full text-xs font-bold border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-600/20 focus:border-red-600" 
                  />
                </div>
                <div className="w-full md:flex-1 min-w-[80px]">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Velocidad</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={step.speed || ''}
                    onChange={(e) => updateStep(step.id, "speed", e.target.value)}
                    className="w-full text-xs font-bold border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-600/20 focus:border-red-600" 
                  />
                </div>
                <div className="w-full md:flex-1 min-w-[80px]">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Frecuencia</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={step.frequency || ''}
                    onChange={(e) => updateStep(step.id, "frequency", e.target.value)}
                    className="w-full text-xs font-bold border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-600/20 focus:border-red-600" 
                  />
                </div>
                {useRotary && (
                  <>
                    <div className="w-full md:flex-1 min-w-[80px]">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Line Spacing</label>
                      <input 
                        type="number" 
                        step="0.001"
                        placeholder="Ej. 0.05"
                        value={step.hatchLineSpacing || ''}
                        onChange={(e) => updateStep(step.id, "hatchLineSpacing", e.target.value)}
                        className="w-full text-xs font-bold border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-600/20 focus:border-red-600" 
                      />
                    </div>
                    <div className="w-full md:flex-1 min-w-[80px]">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ángulo</label>
                      <input 
                        type="number" 
                        step="0.1"
                        placeholder="Ej. 45"
                        value={step.hatchAngle || ''}
                        onChange={(e) => updateStep(step.id, "hatchAngle", e.target.value)}
                        className="w-full text-xs font-bold border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-600/20 focus:border-red-600" 
                      />
                    </div>
                  </>
                )}
                {steps.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeStep(step.id)}
                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100 absolute top-2 right-2 md:relative md:top-0 md:right-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
           <button 
             type="submit" 
             disabled={isSubmitting}
             className="flex items-center gap-2 bg-red-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
           >
              {isSubmitting ? "Guardando..." : "Guardar Proyecto"}
           </button>
        </div>
      </form>

      <StatusModal 
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        message={errorModal.message}
        type="error"
      />
    </div>
  );
}
