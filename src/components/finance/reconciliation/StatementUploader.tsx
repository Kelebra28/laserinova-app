"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import Panel from "@/components/ui/atoms/Panel";
import { formatShortDate } from "@/constants/formatters.constants";
import type { LoadedStatement } from "@/types/bank-overview";

type Props = { onFile: (file: File) => void; reading?: boolean; stored?: LoadedStatement[]; onStored?: (s: LoadedStatement) => void };

/** Zona para soltar o elegir el CSV del banco. */
export default function StatementUploader({ onFile, reading = false, stored = [], onStored }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <Panel title="Sube el estado de cuenta" subtitle="PDF o CSV de tu banco, un mes a la vez">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        onClick={() => !reading && input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center cursor-pointer transition-colors ${over ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-400 hover:bg-gray-50"}`}
      >
        <UploadCloud className="h-8 w-8 text-gray-400" />
        <p className="text-sm font-bold text-gray-900">{reading ? "Leyendo el PDF…" : "Arrastra el archivo aquí o haz clic para elegirlo"}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <FileSpreadsheet className="h-3.5 w-3.5" /> PDF (BBVA) o CSV (cualquier banco)
        </p>
        <input
          ref={input}
          type="file"
          accept=".pdf,.csv,application/pdf,text/csv"
          className="sr-only"
          data-testid="statement-file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>
      <p className="mt-4 text-xs text-gray-500">
        El archivo <b>no se guarda</b>: el CSV se lee en tu navegador y el PDF se procesa en el servidor solo para extraer los movimientos. Subirlo no cambia ningún dato; solo se registra un cobro cuando tú lo confirmas.
      </p>
      {stored.length > 0 && onStored && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="text-xs font-bold text-gray-900">O usa un estado que ya subiste al Panorama</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {stored.map((s) => (
              <li key={s.storedId}>
                <button onClick={() => onStored(s)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs hover:border-gray-900">
                  <span className="font-bold text-gray-900">…{s.accountLast4}</span> <span className="text-gray-500">{s.period ? `${formatShortDate(s.period.from)} al ${formatShortDate(s.period.to)}` : s.fileName}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
