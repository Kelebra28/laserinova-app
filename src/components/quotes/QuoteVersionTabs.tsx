"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Copy, CheckCircle, Loader2 } from "lucide-react";
import { duplicateQuoteAsVersion, approveQuoteVersion } from "@/app/dashboard/quotes/[id]/actions";

type Version = {
  id: string;
  versionName: string | null;
  status: string;
  total: number;
  folio: string;
};

export default function QuoteVersionTabs({ 
  versions, 
  currentQuoteId,
  versionGroupId
}: { 
  versions: Version[], 
  currentQuoteId: string,
  versionGroupId: string | null
}) {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const isEditPage = pathname?.endsWith("/edit");
  const getHref = (id: string) => isEditPage ? `/dashboard/quotes/${id}/edit` : `/dashboard/quotes/${id}`;

  const handleDuplicate = () => {
    startTransition(() => {
      duplicateQuoteAsVersion(currentQuoteId);
    });
  };

  const handleApprove = (groupId: string, quoteId: string) => {
    startTransition(() => {
      approveQuoteVersion(groupId, quoteId);
    });
  };

  if (versions.length <= 1 && !versionGroupId) {
    // Only one quote and no group yet, just show a "Crear Opción Alternativa" button
    return (
      <div className="flex justify-end mb-4">
        <button
          onClick={handleDuplicate}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-red-600 transition-all text-sm font-bold shadow-sm"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
          Crear Opción Alternativa (Duplicar)
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 bg-gray-100 p-1.5 rounded-2xl">
          {versions.map((v, index) => {
            const isActive = v.id === currentQuoteId;
            const isApproved = v.status === "APPROVED";
            return (
              <Link
                key={v.id}
                href={getHref(v.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                  isActive 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {isApproved && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                {v.versionName || `Opción ${index + 1}`}
                <span className="text-[10px] font-bold text-gray-400 bg-gray-50/50 px-2 py-0.5 rounded-lg border border-gray-100">
                  ${v.total.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
                </span>
              </Link>
            );
          })}
        </div>

        <button
          onClick={handleDuplicate}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-red-600 transition-all text-xs font-black uppercase tracking-widest shadow-sm"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
          Duplicar Opción Actual
        </button>
      </div>

      {versionGroupId && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">Aprobación de Proyecto</p>
            <p className="text-sm font-medium text-emerald-600/80 mt-0.5">Selecciona cuál opción fue autorizada por el cliente. Las demás serán descartadas.</p>
          </div>
          <button
            onClick={() => handleApprove(versionGroupId, currentQuoteId)}
            disabled={isPending || versions.find(v => v.id === currentQuoteId)?.status === "APPROVED"}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all text-sm font-black disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {versions.find(v => v.id === currentQuoteId)?.status === "APPROVED" ? "Esta es la Oficial" : "Marcar como Oficial (Aprobar)"}
          </button>
        </div>
      )}
    </div>
  );
}
