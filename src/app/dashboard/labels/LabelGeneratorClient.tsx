"use client";

import { useState, useRef } from "react";
import { Download, RefreshCw, Smartphone, Globe } from "lucide-react";
import * as htmlToImage from "html-to-image";

export default function LabelGeneratorClient() {
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isExporting, setIsExporting] = useState(false);

  const labelRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!labelRef.current) return;
    try {
      setIsExporting(true);
      const dataUrl = await htmlToImage.toPng(labelRef.current, { quality: 1, pixelRatio: 3 });
      
      const link = document.createElement("a");
      link.download = `etiqueta-${clientName.replace(/\s+/g, '-').toLowerCase() || 'envio'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error exporting label", err);
      alert("Hubo un error al generar la etiqueta.");
    } finally {
      setIsExporting(false);
    }
  };

  const clearForm = () => {
    setClientName("");
    setProjectName("");
    setNotes("");
    setDate(new Date().toISOString().split("T")[0]);
  };

  const webUrl = "https://www.laserinova.com/";
  const whatsappUrl = "https://wa.me/525579398727";

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Formulario de Entrada */}
      <div className="w-full lg:w-1/3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-5 h-fit">
        <div>
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Datos de la Etiqueta</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Cliente / Destinatario</label>
              <input 
                type="text" 
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full border-gray-200 rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Proyecto / Contenido</label>
              <input 
                type="text" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ej. 100 Termos Grabados"
                className="w-full border-gray-200 rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Fecha</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border-gray-200 rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Notas (Opcional)</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Frágil / Paquete 1 de 3"
                rows={3}
                className="w-full border-gray-200 rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 flex gap-3">
          <button 
            onClick={clearForm}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-600 px-4 py-3 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Limpiar
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {isExporting ? 'Generando...' : 'Exportar a PNG'}
          </button>
        </div>
      </div>

      {/* Previsualización (Canvas) */}
      <div className="flex-1 flex flex-col gap-4">
        <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Previsualización (A4 / Plotter)</h2>
        <div className="bg-gray-100 p-8 rounded-3xl border border-gray-200 shadow-inner overflow-x-auto flex justify-center items-center min-h-[500px]">
          
          {/* Contenedor de la Etiqueta (Se exportará este div) */}
          <div 
            ref={labelRef} 
            className="bg-white p-8 w-[600px] min-h-[400px] h-auto flex flex-col justify-between border-4 border-gray-900 shadow-2xl relative overflow-hidden"
            style={{ 
              boxSizing: 'border-box',
              backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              backgroundColor: '#ffffff'
            }}
          >
            {/* Header de etiqueta */}
            <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4">
              <img src="/logo_pdf.png" alt="Laser Inova" className="h-12 object-contain" />
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Fecha de Empaque</p>
                <p className="text-lg font-black text-gray-900">{date || 'DD/MM/YYYY'}</p>
              </div>
            </div>

            {/* Contenido Central */}
            <div className="flex-1 py-6 flex flex-col justify-center gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Para:</p>
                <h1 className="text-3xl font-black text-gray-900 leading-tight">
                  {clientName || "Nombre del Cliente"}
                </h1>
              </div>
              
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Proyecto:</p>
                <h2 className="text-2xl font-bold text-gray-800">
                  {projectName || "Descripción del proyecto"}
                </h2>
              </div>

              {notes && (
                <div className="mt-2 p-3 border-2 border-dashed border-gray-400 bg-gray-50 rounded-lg">
                  <p className="text-sm font-bold text-gray-700">{notes}</p>
                </div>
              )}
            </div>

            {/* Footer con QRs */}
            <div className="border-t-2 border-gray-900 pt-4 flex justify-between items-end">
              <div className="flex gap-6">
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-white p-1 rounded-lg shadow-sm w-16 h-16 flex items-center justify-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(webUrl)}&margin=0`} 
                      alt="Web QR" 
                      className="w-full h-full"
                      crossOrigin="anonymous"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 mt-1">
                    <Globe className="w-3 h-3 text-red-600" />
                    <span className="text-[8px] font-black uppercase tracking-wider text-gray-700">Visítanos</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-white p-1 rounded-lg shadow-sm w-16 h-16 flex items-center justify-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(whatsappUrl)}&margin=0`} 
                      alt="WhatsApp QR" 
                      className="w-full h-full"
                      crossOrigin="anonymous"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 mt-1">
                    <Smartphone className="w-3 h-3 text-green-600" />
                    <span className="text-[8px] font-black uppercase tracking-wider text-gray-700">Contáctanos</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1.5">
                <img src="/logo_pdf.png" alt="Laser Inova" className="h-10 object-contain" />
                <div className="text-right">
                  <p className="text-[9px] font-black text-gray-800 tracking-wider uppercase">Corte y Grabado Láser</p>
                  <p className="text-[8px] font-semibold text-gray-400">www.laserinova.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
