"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { getQuoteNoticeContextAction, sendQuoteNoticeAction } from "@/server/actions/whatsapp-notify.actions";
import { NOTICE_FIELDS, NOTICE_LABELS, previewNotice, type NoticeExtra, type NoticeQuote, type QuoteNoticeKind } from "@/lib/whatsapp-templates";

/** Valores que se recuerdan entre avisos (datos de pago, instrucciones de entrega). */
const REMEMBERED = ["paymentInfo", "instructions"] as const;
const storageKey = (k: string) => `wa-notice-${k}`;

export type QuoteNoticeRequest = { quoteId: string; kind: QuoteNoticeKind; extra?: NoticeExtra } | null;

/**
 * Pregunta si se le avisa al cliente por WhatsApp (plantilla aprobada) y deja editar los datos
 * del mensaje antes de mandarlo. Nada sale sin que el usuario confirme.
 */
export default function QuoteNoticeModal({ request, onClose }: { request: QuoteNoticeRequest; onClose: () => void }) {
  const [sending, setSending] = useState(false);
  const [extra, setExtra] = useState<NoticeExtra>({});
  // Contexto cargado para una solicitud concreta: mientras no coincida con la actual, se está cargando.
  const [ctx, setCtx] = useState<{ for: QuoteNoticeRequest; contactName: string | null; quote: NoticeQuote | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    getQuoteNoticeContextAction(request.quoteId).then(res => {
      if (cancelled) return;
      if (!res.success) { setCtx({ for: request, contactName: null, quote: null, error: res.error }); return; }
      const remembered: NoticeExtra = {};
      for (const k of REMEMBERED) {
        const v = localStorage.getItem(storageKey(k));
        if (v) remembered[k] = v;
      }
      setExtra({ deliveryTime: res.data.quote.deliveryTime ?? "", ...remembered, ...request.extra });
      setCtx({ for: request, contactName: res.data.contactName, quote: res.data.quote, error: null });
    });
    return () => { cancelled = true; };
  }, [request]);

  if (!request || typeof document === "undefined") return null;
  const loading = ctx?.for !== request;
  const contactName = loading ? null : ctx.contactName;
  const quote = loading ? null : ctx.quote;
  const error = loading ? null : ctx.error;

  const fields = NOTICE_FIELDS[request.kind];
  const missing = fields.some(f => !String(extra[f.key] ?? "").trim());

  const send = async () => {
    setSending(true);
    const res = await sendQuoteNoticeAction(request.quoteId, request.kind, extra);
    setSending(false);
    if (!res.success) { toast.error(res.error, { duration: 8000 }); return; }
    for (const k of REMEMBERED) if (extra[k]) localStorage.setItem(storageKey(k), extra[k]!);
    toast.success(`Aviso enviado por WhatsApp${contactName ? ` a ${contactName}` : ""}`);
    onClose();
  };

  const content = (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden z-10">
        <div className="p-7 space-y-5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-green-100"><MessageCircle className="h-6 w-6 text-green-600" /></div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">¿Avisar al cliente por WhatsApp?</h3>
              <p className="text-sm text-gray-500">
                {NOTICE_LABELS[request.kind]}
                {quote ? ` · ${quote.folio}` : ""}
                {contactName ? ` · para ${contactName}` : ""}
              </p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : !contactName ? (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3">Esta cotización no tiene un chat de WhatsApp asociado, así que no se puede avisar por aquí.</p>
          ) : quote && (
            <>
              <div className="space-y-3">
                {fields.map(f => (
                  <label key={f.key} className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{f.label}</span>
                    <input
                      value={extra[f.key] ?? ""}
                      onChange={e => setExtra(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      inputMode={f.key === "amount" ? "decimal" : undefined}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none"
                    />
                  </label>
                ))}
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Mensaje que recibirá</span>
                <div className="mt-1 rounded-xl bg-[#e7fbe0] text-[#111b21] text-sm p-3 whitespace-pre-wrap">
                  {previewNotice(request.kind, quote, extra)}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-gray-50/50 p-5 flex flex-col sm:flex-row-reverse gap-3">
          <button
            type="button"
            disabled={sending || loading || !!error || !contactName || missing}
            onClick={send}
            className="flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-[#25D366] hover:bg-[#1DA851] text-white shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sending ? <><Loader2 className="h-3 w-3 animate-spin" /> Enviando…</> : "Enviar aviso"}
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={onClose}
            className="flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:bg-gray-100 border border-gray-100"
          >
            No avisar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
