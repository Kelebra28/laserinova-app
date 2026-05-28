"use client";

import React, { useState, useEffect } from 'react';
import { Mail, X, Loader2, Check, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SendQuoteMailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteId: string;
  folio: string;
  project: string;
  clientName?: string;
  clientEmail?: string;
  hasClientId: boolean;
  userName?: string;
}

export function SendQuoteMailModal({
  isOpen,
  onClose,
  quoteId,
  folio,
  project,
  clientName = "Cliente",
  clientEmail = "",
  hasClientId,
  userName = "Asesor Comercial"
}: SendQuoteMailModalProps) {
  const router = useRouter();
  const [toEmail, setToEmail] = useState(clientEmail);
  const [message, setMessage] = useState('');
  const [saveToClient, setSaveToClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initial prefilled professional message template
  useEffect(() => {
    if (isOpen) {
      const defaultText = `Estimado/a ${clientName},\n\nEs un gusto saludarle de parte de Laser Inova.\n\nEn respuesta a su solicitud, le adjuntamos la cotización formal de su proyecto: "${project}" (Folio: ${folio}).\n\nPor favor revise el archivo PDF adjunto para el desglose detallado de conceptos, precios y condiciones comerciales.\n\nQuedamos a sus enteras órdenes para cualquier duda técnica o comercial.\n\nAtentamente,\n${userName}\nLaser Inova`;
      setMessage(defaultText);
      setToEmail(clientEmail);
      setSaveToClient(false);
      setIsSuccess(false);
      setErrorMessage('');
    }
  }, [isOpen, clientName, project, folio, clientEmail, userName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/quotes/${quoteId}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toEmail,
          message,
          saveToClient,
          sigName: typeof window !== 'undefined' ? localStorage.getItem('sig_name') : '',
          sigTitle: typeof window !== 'undefined' ? localStorage.getItem('sig_title') : '',
          sigPhone: typeof window !== 'undefined' ? localStorage.getItem('sig_phone') : '',
          sigWeb: typeof window !== 'undefined' ? localStorage.getItem('sig_web') : ''
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Error al enviar el correo');
      }

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        router.refresh(); // Refresh page to update sent status / logs
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error de conexión al enviar el correo');
    } finally {
      setIsLoading(false);
    }
  };

  const showSaveCheckbox = hasClientId && (!clientEmail || clientEmail.trim().toLowerCase() !== toEmail.trim().toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-slate-200/80 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-650 to-rose-600 text-white shadow-md">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-red-100" />
            <div>
              <h3 className="font-bold text-sm leading-tight uppercase tracking-wider">Enviar Cotización</h3>
              <p className="text-[10px] text-red-100/85 font-medium mt-0.5">{folio} - {project}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isLoading || isSuccess}
            className="p-1.5 hover:bg-white/10 rounded-full text-white/90 hover:text-white transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 animate-bounce shadow-md">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-base">¡Cotización Enviada con Éxito!</h4>
              <p className="text-xs text-slate-400 mt-1 font-medium">El correo ha sido enviado y registrado en la bitácora del CRM.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 flex flex-col">
            {/* Destinatario Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Correo del Destinatario (Para)</label>
              <input 
                type="email"
                required
                value={toEmail}
                onChange={e => setToEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-red-500 focus:bg-white px-3.5 py-2.5 rounded-xl text-xs text-slate-800 font-semibold outline-none transition-all"
                placeholder="cliente@correo.com"
              />
            </div>

            {/* Guardar Correo Checkbox */}
            {showSaveCheckbox && (
              <label className="flex items-center gap-2.5 p-3.5 bg-red-50/20 border border-red-150/40 rounded-2xl cursor-pointer select-none hover:bg-red-50/40 transition-colors animate-in slide-in-from-top-2">
                <input 
                  type="checkbox"
                  checked={saveToClient}
                  onChange={e => setSaveToClient(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 h-4 w-4 border-slate-300 cursor-pointer"
                />
                <div className="text-left">
                  <p className="text-[11px] font-bold text-slate-800">¿Deseas guardar este correo en el perfil del cliente?</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Se registrará para futuras cotizaciones de {clientName}.</p>
                </div>
              </label>
            )}

            {/* Asunto (Visual pre-filled display) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Asunto</label>
              <div className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs text-slate-500 font-bold tracking-tight">
                Cotización {folio} - Laser Inova
              </div>
            </div>

            {/* Mensaje Textarea */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Mensaje Personalizado</label>
              <textarea 
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-red-500 focus:bg-white px-3.5 py-2.5 rounded-xl text-xs text-slate-700 font-medium outline-none transition-all resize-none h-[220px] leading-relaxed"
                placeholder="Escribe el mensaje del correo..."
              />
            </div>

            {/* Attached PDF Indicator */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50/60 border border-slate-150/70 rounded-2xl flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">Cotizacion_{folio}.pdf</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Archivo adjunto en formato PDF formal</p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <p className="text-xs font-semibold text-red-600 text-left bg-red-50 p-3 rounded-xl border border-red-150/50">
                {errorMessage}
              </p>
            )}

            {/* Footer Actions */}
            <div className="pt-2 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || !toEmail || !message}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-red-650 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all disabled:opacity-50 active:scale-95"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <SendIcon className="w-3.5 h-3.5 text-red-100" />
                    Enviar Correo
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function SendIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
