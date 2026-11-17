"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import Panel from "@/components/ui/atoms/Panel";

type Props = { onFiles: (files: File[]) => void; progress: { done: number; total: number } | null; compact?: boolean };

/** Zona para soltar o elegir varios estados de cuenta en PDF a la vez. */
export default function OverviewUploader({ onFiles, progress, compact = false }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const busy = progress !== null;
  const pick = (list: FileList | null) => {
    if (list && list.length) onFiles([...list]);
  };
  return (
    <Panel title={compact ? "Agregar más estados" : "Sube tus estados de cuenta"} subtitle="PDF de BBVA, de uno o varios meses y cuentas a la vez">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!busy) pick(e.dataTransfer.files);
        }}
        onClick={() => !busy && input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && !busy && input.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 text-center cursor-pointer transition-colors ${compact ? "py-6" : "py-12"} ${over ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-400 hover:bg-gray-50"}`}
      >
        <UploadCloud className="h-8 w-8 text-gray-400" />
        <p className="text-sm font-bold text-gray-900">{busy ? `Leyendo ${Math.min(progress.done + 1, progress.total)} de ${progress.total}…` : "Arrastra los PDFs aquí o haz clic para elegirlos"}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <FileSpreadsheet className="h-3.5 w-3.5" /> Puedes elegir varios a la vez
        </p>
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          className="sr-only"
          data-testid="overview-files"
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {!compact && <p className="mt-4 text-xs text-gray-500">El PDF <b>no se guarda</b>: se lee en el servidor y se guardan solo los movimientos, el saldo y el periodo. Si subes el mismo mes otra vez, no se duplica nada.</p>}
    </Panel>
  );
}
