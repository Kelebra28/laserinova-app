import React from "react";

interface GlobalLoaderProps {
  label?: string;
  subLabel?: string;
  minHeight?: string;
}

export function GlobalLoader({ 
  label = "Cargando", 
  subLabel = "Laser Inova CRM", 
  minHeight = "min-h-[60vh]" 
}: GlobalLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${minHeight} space-y-4 w-full bg-transparent`}>
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="absolute inset-0 border-4 border-slate-100 border-t-red-500 rounded-full animate-spin"></div>
      </div>
      <div className="flex flex-col items-center space-y-1">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest animate-pulse">
          {label}
        </h3>
        {subLabel && (
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
            {subLabel}
          </p>
        )}
      </div>
    </div>
  );
}
