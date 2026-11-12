"use client";

import { useState } from "react";
import { CheckCircle, X, Save, AlertTriangle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface ConfirmSaveModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/** Confirmación antes de guardar una cotización (nueva, editada o rápida). */
export default function ConfirmSaveModal({
  isOpen,
  onConfirm,
  onCancel,
  title = "¿Guardar cotización?",
  message = "Se registrará esta cotización en el sistema.",
  detail,
  confirmLabel = "Sí, guardar",
  cancelLabel = "Cancelar",
}: ConfirmSaveModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = () => {
    setIsSubmitting(true);
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      dismissible={!isSubmitting}
      sheetOnMobile
      backdropClassName="bg-black/40"
      panelClassName="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-black/20 p-8 animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Close button */}
      {!isSubmitting && (
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-gray-300 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg shadow-gray-900/20">
          <Save className="h-8 w-8 text-white" />
        </div>
      </div>

      {/* Text */}
      <h3 className="text-xl font-black text-gray-900 text-center mb-2">
        {title}
      </h3>
      <p className="text-sm font-medium text-gray-500 text-center mb-2">
        {message}
      </p>
      {detail && (
        <p className="text-xs font-bold text-gray-400 text-center bg-gray-50 rounded-xl px-4 py-2 mb-2">
          {detail}
        </p>
      )}

      <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-4 mb-6">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        <p className="text-[11px] font-bold text-amber-700">
          Una vez guardada, la cotización aparecerá en el listado con un folio asignado.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 text-sm font-black text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          {cancelLabel}
        </button>
        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="flex-1 py-3 px-4 rounded-2xl bg-gray-900 text-sm font-black text-white hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-900/20 flex items-center justify-center gap-2 disabled:opacity-80 disabled:pointer-events-none"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          {isSubmitting ? "Guardando..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
