"use client";

import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { sendQuoteViaWhatsAppAction } from "@/server/actions/quote.actions";
import { toast } from "react-hot-toast";

interface Props {
  quoteId: string;
  hasClientId: boolean;
  hasContactId: boolean;
}

export function SendQuoteWhatsAppButton({ quoteId, hasClientId, hasContactId }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!hasClientId && !hasContactId) {
      toast.error("Esta cotización no está asociada a ningún cliente ni chat de WhatsApp.");
      return;
    }

    setLoading(true);
    try {
      const res = await sendQuoteViaWhatsAppAction(quoteId);
      if (res.success) {
        toast.success("¡PDF enviado! La Secretaria se encargará del resto.");
      } else {
        toast.error("Error: " + res.error);
      }
    } catch (error: any) {
      toast.error("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSend}
      disabled={loading || (!hasClientId && !hasContactId)}
      className="inline-flex items-center px-6 py-2.5 bg-[#25D366] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#1DA851] transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
      {loading ? "Enviando..." : "Enviar por WA (IA)"}
    </button>
  );
}
