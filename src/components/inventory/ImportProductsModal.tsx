"use client";

import { useState, useRef } from "react";
import { Upload, X, Check, AlertCircle, FileSpreadsheet, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Papa from "papaparse";
import { validateProductsImport, executeProductsImport } from "@/app/dashboard/inventory/actions";

export default function ImportProductsModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"UPLOAD" | "REVIEW" | "IMPORTING" | "DONE">("UPLOAD");
  const [newProducts, setNewProducts] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set());
  const [invalidRows, setInvalidRows] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setStep("IMPORTING");
        const res = await validateProductsImport(results.data);
        if (res.success) {
          setNewProducts(res.newProducts || []);
          setConflicts(res.conflicts || []);
          setInvalidRows(res.invalidRows || []);
          
          // Por defecto, seleccionamos todos los conflictos para actualizar
          const allConflictIds = (res.conflicts || []).map((c: any) => c.existing.id);
          setSelectedConflicts(new Set(allConflictIds));
          
          setStep("REVIEW");
        } else {
          toast.error(res.error || "Error al validar el archivo");
          setStep("UPLOAD");
        }
      },
      error: () => {
        toast.error("Error al leer el archivo CSV");
        setStep("UPLOAD");
      }
    });
  };

  const toggleConflict = (id: string) => {
    const next = new Set(selectedConflicts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedConflicts(next);
  };

  const toggleAllConflicts = () => {
    if (selectedConflicts.size === conflicts.length) {
      setSelectedConflicts(new Set());
    } else {
      setSelectedConflicts(new Set(conflicts.map(c => c.existing.id)));
    }
  };

  const handleImport = async () => {
    setStep("IMPORTING");
    const productsToUpdate = conflicts.filter(c => selectedConflicts.has(c.existing.id));
    
    const res = await executeProductsImport(newProducts, productsToUpdate);
    if (res.success) {
      toast.success("Productos importados correctamente");
      setStep("DONE");
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    } else {
      toast.error(res.error || "Error al importar");
      setStep("REVIEW");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-lg font-black text-gray-800">Importar Productos por CSV</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === "UPLOAD" && (
            <div className="text-center space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-2xl p-12 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-all flex flex-col items-center justify-center"
              >
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                <div className="w-16 h-16 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Sube tu archivo CSV</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                  Asegúrate de que las columnas sean: <b>nombre, modelo, categoria, color, marca, costo, precio_venta, stock, notas, imagen_url</b>
                </p>
              </div>

              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm text-left">
                <p className="font-bold flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4"/> Formato Obligatorio</p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>El archivo debe estar separado por comas (.csv).</li>
                  <li>Las columnas <b>nombre</b> y <b>categoria</b> son obligatorias.</li>
                  <li>Si la categoría no existe, el sistema la creará automáticamente.</li>
                  <li>Si dejas el stock vacío, se asignará 0.</li>
                </ul>
              </div>
            </div>
          )}

          {step === "IMPORTING" && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-gray-800">Procesando archivo...</h3>
              <p className="text-gray-500 mt-2">Estamos validando los productos y conflictos.</p>
            </div>
          )}

          {step === "DONE" && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">¡Importación Exitosa!</h3>
              <p className="text-gray-500 mt-2">Los productos ya están en tu inventario.</p>
            </div>
          )}

          {step === "REVIEW" && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-emerald-600">{newProducts.length}</p>
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mt-1">Nuevos</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-amber-600">{conflicts.length}</p>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mt-1">Repetidos</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-red-600">{invalidRows.length}</p>
                  <p className="text-xs font-bold text-red-800 uppercase tracking-wider mt-1">Errores</p>
                </div>
              </div>

              {invalidRows.length > 0 && (
                <div className="bg-red-50 p-4 rounded-xl text-xs text-red-800">
                  <p className="font-bold mb-1">Hay filas que no se importarán por falta de nombre o categoría.</p>
                </div>
              )}

              {conflicts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800">Productos Repetidos</h3>
                    <button onClick={toggleAllConflicts} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg">
                      {selectedConflicts.size === conflicts.length ? "Ignorar Todos" : "Actualizar Todos"}
                    </button>
                  </div>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-64">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="p-3 w-10"></th>
                          <th className="p-3 font-bold text-gray-600 uppercase">Producto</th>
                          <th className="p-3 font-bold text-gray-600 uppercase text-center">Precio Actual</th>
                          <th className="p-3 font-bold text-gray-600 uppercase text-center">Precio Nuevo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conflicts.map((c, i) => (
                          <tr key={i} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => toggleConflict(c.existing.id)}>
                            <td className="p-3 text-center">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedConflicts.has(c.existing.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                {selectedConflicts.has(c.existing.id) && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-gray-800">{c.existing.name}</p>
                              <p className="text-gray-400">{c.existing.model}</p>
                            </td>
                            <td className="p-3 text-center text-gray-500 line-through">${c.existing.unitPrice.toFixed(2)}</td>
                            <td className="p-3 text-center font-bold text-emerald-600">${c.incoming.unitPrice.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {step === "REVIEW" && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
              Cancelar
            </button>
            <button 
              onClick={handleImport}
              className="px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4" /> 
              Importar {newProducts.length + selectedConflicts.size} Productos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
