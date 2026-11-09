"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal({ title, message, confirmLabel = "Eliminar", onConfirm, onCancel, loading = false }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ animation: "modalIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        {/* Red accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-600" />

        <div className="px-6 py-5">
          {/* Icon + Title */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">{title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{message}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-5">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 disabled:opacity-50 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold shadow-md shadow-red-600/25 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.88) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  );
}
