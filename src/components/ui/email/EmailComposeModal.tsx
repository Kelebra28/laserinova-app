import React, { useState, useCallback, useEffect } from 'react';
import { X, Send, Paperclip, Loader2, Trash2, Sparkles, FileText, ChevronRight } from 'lucide-react';

interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (to: string, cc: string, subject: string, text: string, files: File[]) => Promise<boolean>;
  isSending: boolean;
  initialTo?: string;
  initialSubject?: string;
  initialText?: string;
}

export function EmailComposeModal({ 
  isOpen, 
  onClose, 
  onSend, 
  isSending,
  initialTo = '',
  initialSubject = '',
  initialText = ''
}: EmailComposeModalProps) {
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [text, setText] = useState(initialText);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Synchronize state when initial values are supplied or modal opens
  useEffect(() => {
    if (isOpen) {
      setTo(initialTo);
      setCc('');
      setSubject(initialSubject);
      setText(initialText);
    }
  }, [isOpen, initialTo, initialSubject, initialText]);

  const templates = [
    {
      id: 'quote',
      name: 'Cotización Formal (LaserInova)',
      subject: 'Cotización Formal - Servicios de Grabado/Corte Láser - LaserInova',
      body: `Estimado/a [Nombre del Cliente],\n\nEs un gusto saludarle de parte del equipo de LaserInova.\n\nEn respuesta a su solicitud, le adjuntamos la propuesta comercial y cotización formal para el servicio requerido de corte y grabado de alta precisión.\n\nDetalles clave:\n- Tecnología empleada: Corte por láser de CO2 / Grabado con láser de fibra de alta velocidad.\n- Tiempos de entrega estimados: de 3 a 5 días hábiles a partir de la confirmación de diseño.\n- Vigencia de la cotización: 15 días naturales.\n\nPor favor revise el archivo adjunto para el desglose detallado de precios y condiciones comerciales. Quedamos a sus enteras órdenes para cualquier ajuste o duda técnica.\n\nAtentamente,\n[Tu Nombre]\nAsesor Comercial\nLaserInova\nCel: [Tu Teléfono]`
    },
    {
      id: 'followup',
      name: 'Seguimiento de Plotter / Venta',
      subject: 'Seguimiento: Asesoría especializada sobre Plotter de Impresión y Corte',
      body: `Estimado/a [Nombre del Cliente],\n\nEspero que se encuentre excelente. Le escribo para dar seguimiento a su interés en nuestros plotters de impresión y corte de última generación LaserInova.\n\nQueremos asegurarnos de que cuenta con toda la información necesaria (especificaciones técnicas de los cabezales, velocidades de producción y facilidades de financiamiento directo) para tomar la mejor decisión para su negocio.\n\nSi lo desea, podemos agendar una breve demostración física o virtual de 10 minutos para mostrarle el equipo en funcionamiento real. ¿Tiene disponibilidad este miércoles o jueves?\n\nQuedo a su entera disposición.\n\nSaludos cordiales,\n[Tu Nombre]\nLaserInova`
    },
    {
      id: 'delivery',
      name: 'Pedido Listo para Entrega',
      subject: 'Su pedido de LaserInova está listo para entrega / envío',
      body: `Estimado/a [Nombre del Cliente],\n\nNos complace informarle que sus piezas personalizadas han pasado exitosamente el control de calidad de LaserInova y se encuentran listas para entrega.\n\nDetalles de la entrega:\n- Método: [Envío por Paquetería / Recoger en Sucursal]\n- Número de guía (si aplica): [Insertar Guía]\n- Contenido: Piezas grabadas / cortadas a precisión.\n\nAgradecemos enormemente su preferencia y confianza en nuestros servicios industriales de corte y grabado. Adjunto encontrará su factura de compra.\n\n¡Que tenga un excelente día!\n\nAtentamente,\n[Tu Nombre]\nLogística y Entregas\nLaserInova`
    },
    {
      id: 'welcome',
      name: 'Presentación Comercial',
      subject: 'Soluciones de Corte y Grabado Láser de alta precisión - LaserInova',
      body: `Estimado/a [Nombre del Cliente],\n\nMe pongo en contacto con usted para presentarle los servicios de LaserInova. Nos especializamos en brindar soluciones de manufactura y personalización de alta calidad:\n\n- Corte y grabado láser en acrílico, madera, cuero y plásticos.\n- Grabado de alta velocidad en metales (láser de fibra) para termos, placas y herramientas.\n- Venta, mantenimiento y consumibles de Plotters de Impresión y Corte industriales.\n\nContamos con la tecnología más avanzada del mercado para asegurar que sus proyectos tengan la mayor nitidez, rapidez y el costo más competitivo del sector.\n\nMe encantaría enviarle un muestrario de nuestros trabajos sin compromiso. ¿Podríamos coordinar una breve llamada esta semana?\n\nAtentamente,\n[Tu Nombre]\nDirector de Ventas\nLaserInova`
    }
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const applyTemplate = (tpl: typeof templates[0]) => {
    setSubject(tpl.subject);
    setText(tpl.body);
    setShowTemplates(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !subject || !text) return;
    
    const success = await onSend(to, cc, subject, text, files);
    if (success) {
      setTo('');
      setCc('');
      setSubject('');
      setText('');
      setFiles([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="flex gap-4 items-end pointer-events-auto">
        {/* Templates Panel (Opens alongside) */}
        {showTemplates && (
          <div className="w-[320px] h-[550px] bg-white rounded-2xl shadow-[0_15px_35px_-5px_rgba(0,0,0,0.15)] border border-gray-200/80 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200">
            <div className="px-4 py-3 bg-red-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-200 animate-pulse" />
                <h4 className="font-semibold text-xs uppercase tracking-wider">Plantillas Profesionales</h4>
              </div>
              <button 
                onClick={() => setShowTemplates(false)} 
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 overflow-y-auto flex-1 space-y-2.5 bg-gray-50/50">
              <p className="text-xs text-gray-500 font-medium px-1">Selecciona una plantilla para rellenar automáticamente el correo:</p>
              {templates.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="w-full text-left p-3 bg-white hover:bg-red-50/30 border border-gray-150 hover:border-red-200 rounded-xl transition-all group flex items-start gap-2.5 shadow-sm active:scale-[0.98]"
                >
                  <FileText className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0 flex-1">
                    <h5 className="font-semibold text-xs text-gray-800 group-hover:text-red-700 transition-colors">{tpl.name}</h5>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{tpl.subject}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform mt-1" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Compose Modal */}
        <div 
          className="w-[520px] h-[550px] bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col border border-gray-200/80 overflow-hidden transition-all duration-300 relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag Overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-red-50/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-2 border-red-500 border-dashed m-2 rounded-xl">
              <Paperclip className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
              <p className="text-lg font-semibold text-red-700">Suelta los archivos aquí</p>
              <p className="text-xs text-red-500/80 mt-1">Se adjuntarán automáticamente a tu mensaje</p>
            </div>
          )}

          {/* Header (Gmail style but dark premium/modern) */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white shadow-md">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="font-semibold text-xs tracking-wide uppercase">Nuevo Mensaje</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                  showTemplates 
                    ? 'bg-rose-500 border-rose-400 text-white' 
                    : 'bg-gray-800 border-gray-700 text-rose-300 hover:bg-gray-700'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Redactar Pro
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 p-4 space-y-3 bg-gray-50/10">
            {/* Para (To) */}
            <div className="flex items-center border-b border-gray-150/70 pb-2">
              <span className="text-xs font-medium text-gray-400 w-12">Para:</span>
              <input 
                type="text" 
                value={to}
                onChange={e => setTo(e.target.value)}
                required
                placeholder="ejemplo@correo.com, otro@correo.com"
                className="flex-1 bg-transparent outline-none text-xs text-gray-700 placeholder-gray-400"
              />
            </div>

            {/* CC */}
            <div className="flex items-center border-b border-gray-150/70 pb-2">
              <span className="text-xs font-medium text-gray-400 w-12">CC:</span>
              <input 
                type="text" 
                value={cc}
                onChange={e => setCc(e.target.value)}
                placeholder="copia@correo.com"
                className="flex-1 bg-transparent outline-none text-xs text-gray-700 placeholder-gray-400"
              />
            </div>

            {/* Asunto (Subject) */}
            <div className="flex items-center border-b border-gray-150/70 pb-2">
              <span className="text-xs font-medium text-gray-400 w-12">Asunto:</span>
              <input 
                type="text" 
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
                placeholder="Asunto de tu correo profesional"
                className="flex-1 bg-transparent outline-none text-xs font-semibold text-gray-800 placeholder-gray-400"
              />
            </div>

            {/* Body */}
            <textarea 
              placeholder="Redacta el contenido de tu correo aquí o usa nuestro botón 'Redactar Pro' para cargar una plantilla profesional..."
              value={text}
              onChange={e => setText(e.target.value)}
              required
              className="flex-1 w-full bg-transparent outline-none text-xs text-gray-700 resize-none font-sans leading-relaxed pt-2"
            />

            {/* Attachments List */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pt-2 border-t border-gray-100">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-gray-100 border border-gray-200/60 px-2 py-1 rounded-lg text-[10px]">
                    <Paperclip className="w-2.5 h-2.5 text-gray-500" />
                    <span className="truncate max-w-[120px] text-gray-600 font-medium">{file.name}</span>
                    <button 
                      type="button" 
                      onClick={() => removeFile(i)}
                      className="text-red-400 hover:text-red-600 transition-colors ml-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100/70">
              <div className="flex items-center gap-1">
                <label className="cursor-pointer text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <input type="file" multiple className="hidden" onChange={handleFileChange} />
                  <Paperclip className="w-4 h-4" />
                </label>
                <button
                  type="button"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50/50 transition-colors"
                  title="Insertar plantilla profesional"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>

              <button 
                type="submit" 
                disabled={isSending || !to || !subject || !text}
                className="flex items-center gap-1.5 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-full shadow-md hover:shadow-lg transition-all disabled:opacity-40 active:scale-95"
              >
                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {isSending ? 'Enviando...' : 'Enviar Correo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
