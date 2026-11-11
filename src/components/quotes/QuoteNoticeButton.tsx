"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, ChevronDown } from "lucide-react";
import QuoteNoticeModal, { type QuoteNoticeRequest } from "@/components/whatsapp/QuoteNoticeModal";
import { NOTICE_LABELS, type QuoteNoticeKind } from "@/lib/whatsapp-templates";

const ORDER: QuoteNoticeKind[] = ["deposit", "paid", "production", "ready"];

/** Menú para mandar a mano cualquier aviso de pedido por WhatsApp (plantillas aprobadas). */
export function QuoteNoticeButton({ quoteId, disabled }: { quoteId: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<QuoteNoticeRequest>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        title={disabled ? "Esta cotización no está asociada a ningún cliente ni chat" : "Mandar un aviso del pedido por WhatsApp"}
        className="inline-flex items-center px-6 py-2.5 bg-white text-[#128C7E] border border-[#25D366]/50 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#25D366]/10 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <BellRing className="mr-2 h-4 w-4" />
        Avisar por WA
        <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-gray-100 py-1 z-30">
          {ORDER.map(kind => (
            <button
              key={kind}
              type="button"
              onClick={() => { setOpen(false); setNotice({ quoteId, kind }); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {NOTICE_LABELS[kind]}
            </button>
          ))}
        </div>
      )}
      <QuoteNoticeModal request={notice} onClose={() => setNotice(null)} />
    </div>
  );
}
