"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard caught error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
      <div className="bg-red-50 text-red-600 p-6 rounded-3xl max-w-lg shadow-sm border border-red-100 flex flex-col items-center">
        <div className="bg-red-100 p-4 rounded-full mb-4">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Error de Servidor</h2>
        <p className="text-red-700 font-medium mb-6">
          Hubo un problema de conexión. Es probable que la base de datos esté saturada en este momento.
        </p>
        <div className="bg-white/50 p-4 rounded-xl w-full text-left text-xs font-mono text-red-800 mb-6 overflow-auto">
          {error.message || "Error interno del servidor"}
        </div>
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 active:scale-95"
        >
          <RefreshCcw className="h-4 w-4" />
          Reintentar conexión
        </button>
      </div>
    </div>
  );
}
