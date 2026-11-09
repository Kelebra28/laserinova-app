"use client";

import { useState } from "react";
import Select from "@/components/ui/Select";

interface Props {
  initial: {
    margen_producto_1: number;
    margen_producto_2: number;
    margen_producto_3: number;
    producto_escala_2: number;
    producto_escala_3: number;
    proveedor_incluye_iva: number;
  };
}

const inputClass =
  "w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-900 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all font-bold";

function Field({ name, value, onChange, unit }: { name: string; value: number | string; onChange?: (v: string) => void; unit: string }) {
  return (
    <div className="relative">
      <input
        type="number"
        step="0.01"
        min="0"
        name={name}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`${inputClass} pr-14`}
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 pointer-events-none uppercase">
        {unit}
      </span>
    </div>
  );
}

export function ProductPricingFields({ initial }: Props) {
  const [m1, setM1] = useState<number | string>(initial.margen_producto_1);
  const [m2, setM2] = useState<number | string>(initial.margen_producto_2);
  const [m3, setM3] = useState<number | string>(initial.margen_producto_3);
  const [e2, setE2] = useState<number | string>(initial.producto_escala_2);
  const [e3, setE3] = useState<number | string>(initial.producto_escala_3);
  const [includesIva, setIncludesIva] = useState(String(initial.proveedor_incluye_iva ? 1 : 0));

  const e2n = Number(e2) || 0;
  const e3n = Number(e3) || 0;
  const invalidScales = e3n <= e2n;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-100 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1.1fr_1.6fr_1fr] gap-4 px-5 py-3 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
          <span>Escala</span>
          <span>Cantidad de piezas</span>
          <span>Margen de ganancia</span>
        </div>

        {/* Escala 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_1.6fr_1fr] gap-3 sm:gap-4 items-center px-5 py-4 border-t border-gray-100">
          <div>
            <p className="text-sm font-black text-gray-800">Escala 1</p>
            <p className="text-[11px] text-gray-400">Pocas piezas</p>
          </div>
          <p className="text-sm font-bold text-gray-600">
            De 1 a <span className="text-gray-900">{Math.max(e2n - 1, 1)}</span> piezas
          </p>
          <Field name="margen_producto_1" value={m1} onChange={setM1} unit="%" />
        </div>

        {/* Escala 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_1.6fr_1fr] gap-3 sm:gap-4 items-center px-5 py-4 border-t border-gray-100">
          <div>
            <p className="text-sm font-black text-gray-800">Escala 2</p>
            <p className="text-[11px] text-gray-400">Medio volumen</p>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
            <span className="shrink-0">Desde</span>
            <div className="w-28"><Field name="producto_escala_2" value={e2} onChange={setE2} unit="pzs" /></div>
            <span className="shrink-0">a {Math.max(e3n - 1, e2n)}</span>
          </div>
          <Field name="margen_producto_2" value={m2} onChange={setM2} unit="%" />
        </div>

        {/* Escala 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_1.6fr_1fr] gap-3 sm:gap-4 items-center px-5 py-4 border-t border-gray-100">
          <div>
            <p className="text-sm font-black text-gray-800">Escala 3</p>
            <p className="text-[11px] text-gray-400">Volumen</p>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
            <span className="shrink-0">Desde</span>
            <div className="w-28"><Field name="producto_escala_3" value={e3} onChange={setE3} unit="pzs" /></div>
            <span className="shrink-0">en adelante</span>
          </div>
          <Field name="margen_producto_3" value={m3} onChange={setM3} unit="%" />
        </div>
      </div>

      {invalidScales && (
        <p className="text-xs font-bold text-red-600">
          La Escala 3 debe empezar en más piezas que la Escala 2.
        </p>
      )}

      <div className="max-w-sm">
        <Select
          label="Precio que cobra el proveedor"
          value={includesIva}
          onChange={(v: string) => setIncludesIva(v)}
          options={[
            { value: "0", label: "Viene sin IVA (se le suma)" },
            { value: "1", label: "Ya incluye IVA" },
          ]}
        />
        <input type="hidden" name="proveedor_incluye_iva" value={includesIva} />
      </div>
    </div>
  );
}
