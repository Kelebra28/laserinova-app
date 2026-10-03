"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { UploadCloud } from "lucide-react";

export function KnowledgeImportCard() {
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<string>("pinecone_secretary");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Selecciona al menos un archivo CSV primero");
      return;
    }

    setLoading(true);
    let successCount = 0;
    
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        const res = await fetch("/api/admin/import-csv", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        
        if (data.success) {
          successCount++;
        } else {
          toast.error(`Error en ${file.name}: ${data.error}`);
        }
      }
      
      if (successCount > 0) {
        toast.success(`Se inyectaron ${successCount} archivos exitosamente`);
        setFiles([]);
      }
    } catch (error: any) {
      toast.error("Error de conexión: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
      <UploadCloud className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 text-white" />
      
      <h3 className="font-black text-lg mb-4 text-white flex items-center gap-2">
        Inyectar Conocimiento (CSV)
      </h3>
      
      <div className="space-y-4 relative z-10">
        <select 
          className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
          value={type} 
          onChange={(e) => setType(e.target.value)}
        >
          <option value="pinecone_secretary" className="text-black">🧠 Reglas Secretaria (Pinecone)</option>
          <option value="pinecone_chalan" className="text-black">👷🏽‍♂️ Reglas Chalán (Pinecone)</option>
          <option value="materials" className="text-black">📦 Materiales (DB)</option>
          <option value="costs" className="text-black">💰 Costos/Gastos Fijos (DB)</option>
          <option value="machines" className="text-black">⚙️ Máquinas/Procesos (DB)</option>
        </select>

        <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-white/30 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
          <UploadCloud className="w-8 h-8 text-white/70 mb-2" />
          <span className="text-sm font-bold text-white text-center">
            {files.length > 0 ? `${files.length} archivo(s) seleccionado(s)` : "Haz clic para seleccionar archivos CSV"}
          </span>
          <span className="text-xs text-white/50 mt-1">
            {files.length > 0 ? Array.from(files).map(f => f.name).join(', ') : "Puedes seleccionar múltiples archivos .csv"}
          </span>
          <input 
            type="file" 
            accept=".csv"
            multiple
            onChange={(e) => {
              if (e.target.files) {
                setFiles(Array.from(e.target.files));
              }
            }}
            className="hidden"
          />
        </label>

        <button 
          onClick={handleUpload}
          disabled={loading || files.length === 0}
          className="w-full py-2 px-4 bg-white text-indigo-900 font-bold rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-all text-sm"
        >
          {loading ? "Inyectando..." : "Subir e Inyectar"}
        </button>
      </div>
    </div>
  );
}
