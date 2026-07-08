"use client";

import { Info, Calculator, Zap, Scissors, TrendingUp, Box } from "lucide-react";

interface CalculationAuditProps {
  concepts: any[];
  margin: number;
}

export default function CalculationAudit({ concepts, margin }: CalculationAuditProps) {
  const divisor = (100 - margin) / 100;
  const formulaConcepts = concepts.filter(c => c.type === "CORTE" || c.type === "GRABADO" || c.type === "SERVICIO_SITIO");

  return (
    <div className="bg-gray-900 text-gray-100 rounded-2xl p-6 shadow-2xl border border-gray-800 space-y-6">
      <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
        <div className="p-2 bg-red-500/10 rounded-lg">
          <Calculator className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest">Auditoría de Fórmulas</h3>
          <p className="text-[10px] text-gray-500 font-bold uppercase">Transparencia en el motor de cálculo</p>
        </div>
      </div>

      {formulaConcepts.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase text-gray-400 mb-2">Desglose por Concepto (Cotización Actual)</h4>
          {formulaConcepts.map((c, idx) => (
            <div key={idx} className="bg-gray-800/80 p-4 rounded-xl border border-gray-700/50 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-700/50 pb-2">
                <span className="text-xs font-black uppercase text-white tracking-widest">{c.description || `Concepto #${idx + 1}`}</span>
                <span className="text-[10px] bg-gray-700 px-2 py-1 rounded-md font-bold uppercase">{c.type}</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(c.type === "CORTE" || c.type === "GRABADO") && (
                  <>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><Scissors className="w-3 h-3 text-blue-400"/> Base Mat. (Por Pieza)</p>
                      <p className="text-sm font-mono text-blue-400 font-bold">${c.calculated?.materialBaseCost?.toFixed(2) || "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><Scissors className="w-3 h-3 text-red-400"/> Merma (Por Pieza)</p>
                      <p className="text-sm font-mono text-red-400 font-bold">${c.calculated?.materialWastageCost?.toFixed(2) || "0.00"}</p>
                    </div>
                  </>
                )}
                
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><Zap className="w-3 h-3 text-orange-400"/> Operación (Por Pieza)</p>
                  <p className="text-sm font-mono text-orange-400 font-bold">${c.calculated?.productionCost?.toFixed(2) || (c.type === "SERVICIO_SITIO" ? c.calculated?.realCost?.toFixed(2) : "0.00")}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400"/> Costo Total (Por Pieza)</p>
                  <p className="text-sm font-mono text-emerald-400 font-bold">${c.calculated?.realCost?.toFixed(2) || "0.00"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 text-center">
          <p className="text-xs text-gray-400">Agrega conceptos de Corte o Grabado para ver su desglose matemático en tiempo real.</p>
        </div>
      )}

      <div className="space-y-4 pt-4 border-t border-gray-800">
        <h4 className="text-xs font-black uppercase text-gray-400 mb-2">Explicación de Fórmulas Base</h4>
        {/* Fórmula 1: Material */}
        <div className="bg-gray-800/30 p-3 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Scissors className="h-4 w-4 text-blue-400" />
            <span className="text-[11px] font-black uppercase tracking-tight text-blue-400">1. Material</span>
          </div>
          <p className="text-[10px] font-mono text-gray-400 leading-relaxed">
            Hoja Base: <span className="text-gray-300">Precio de Hoja (Con IVA) × Factor Transporte (ej. 1.20)</span><br/>
            Costo Pieza: <span className="text-gray-300">Área (cm²) × Precio por cm² de la Hoja Base</span><br/>
            Merma: <span className="text-gray-300">Costo Pieza × % Merma de Corte</span>
          </p>
        </div>

        {/* Fórmula 2: Máquina */}
        <div className="bg-gray-800/30 p-3 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-orange-400" />
            <span className="text-[11px] font-black uppercase tracking-tight text-orange-400">2. Operación (Máquina)</span>
          </div>
          <p className="text-[10px] font-mono text-gray-400 leading-relaxed">
            Final: <span className="text-gray-300">CostoTuboMinuto × Tiempo × F. Miedo (2) × F. Prod (3)</span>
          </p>
        </div>
        
        {/* Fórmula 3: Precio de Venta */}
        <div className="bg-gray-800/30 p-3 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-[11px] font-black uppercase tracking-tight text-emerald-400">3. Venta</span>
          </div>
          <p className="text-[10px] font-mono text-gray-400 leading-relaxed">
            Sugerido: <span className="text-gray-300">Costo Total / {divisor.toFixed(2)} (por margen del {margin}%)</span>
          </p>
        </div>
      </div>

      <div className="pt-2">
        <div className="flex items-start gap-2 bg-blue-500/5 p-3 rounded-lg border border-blue-500/10">
          <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-400 font-medium leading-normal">
            Nota: Si la cotización se hizo antes y se guardó con fórmulas viejas, los precios de venta cargados permanecerán estáticos para respetar la cotización, pero aquí podrás ver lo que la fórmula calcula hoy al modificar cualquier parámetro físico (tiempo, material, etc).
          </p>
        </div>
      </div>
    </div>
  );
}
