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
    <div className={`flex flex-col items-center justify-center ${minHeight} space-y-6 bg-black w-full`}>
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Anillo exterior rotando */}
        <div className="absolute inset-0 border-[6px] border-zinc-900 border-t-red-600 rounded-full animate-spin"></div>
        
        {/* Anillo interior rotando en dirección opuesta */}
        <div className="absolute inset-2 border-[4px] border-zinc-900 border-b-red-600 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }}></div>
        
        {/* Centro pulsante rojo */}
        <div className="absolute inset-6 bg-zinc-950 rounded-full flex items-center justify-center border border-red-900">
          <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_rgba(220,38,38,1)]"></div>
        </div>
      </div>
      <div className="flex flex-col items-center space-y-1">
        <h3 className="text-base font-black text-white uppercase tracking-[0.2em] animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
          {label}
        </h3>
        <p className="text-xs text-red-500 uppercase tracking-widest font-bold drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]">
          {subLabel}
        </p>
      </div>
    </div>
  );
}
