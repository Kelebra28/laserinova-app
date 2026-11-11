"use client";

import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { sendQuoteViaWhatsAppAction, getQuoteWhatsAppWindowAction } from "@/server/actions/quote.actions";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { formatDuration } from "@/lib/whatsapp-window";
import { toast } from "react-hot-toast";

interface Props {
  quoteId: string;
  hasClientId: boolean;
  hasContactId: boolean;
}

function sinceText(lastInboundAt: string | null) {
  if (!lastInboundAt) return "El cliente nunca ha escrito a este número de WhatsApp.";
  const d = new Date(lastInboundAt);
  const when = d.toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return `El último mensaje del cliente fue el ${when} (hace ${formatDuration(Date.now() - d.getTime())}).`;
}

export function SendQuoteWhatsAppButton({ quoteId, hasClientId, hasContactId }: Props) {
  const [loading, setLoading] = useState(false);
  const [templatePrompt, setTemplatePrompt] = useState<string | null>(null);

  const send = async () => {
    setLoading(true);
    try {
      const res = await sendQuoteViaWhatsAppAction(quoteId);
      if (res.success) {
        toast.success(res.viaTemplate
          ? "PDF enviado con la plantilla de WhatsApp. El bot no le escribirá hasta que el cliente conteste."
          : "¡PDF enviado! La Secretaria se encargará del resto.");
      } else {
        toast.error("Error: " + res.error, { duration: 8000 });
      }
    } catch {
      toast.error("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
      setTemplatePrompt(null);
    }
  };

  const handleSend = async () => {
    if (!hasClientId && !hasContactId) {
      toast.error("Esta cotización no está asociada a ningún cliente ni chat de WhatsApp.");
      return;
    }

    // Revisar la ventana de 24 h antes de mandar: fuera de ella Meta "acepta" el PDF pero no lo entrega.
    setLoading(true);
    let win: Awaited<ReturnType<typeof getQuoteWhatsAppWindowAction>> | null = null;
    try {
      win = await getQuoteWhatsAppWindowAction(quoteId);
    } catch {
      // Si no se pudo revisar, el envío igual valida la ventana del lado del servidor.
    }
    setLoading(false);

    if (win?.found && !win.open) {
      if (!win.templateConfigured) {
        toast.error(
          `Pasaron más de 24 h: WhatsApp no entregaría el PDF. ${sinceText(win.lastInboundAt)} Espera a que el cliente escriba o configura la plantilla de cotización.`,
          { duration: 10000 }
        );
        return;
      }
      setTemplatePrompt(sinceText(win.lastInboundAt));
      return;
    }

    await send();
  };

  return (
    <>
      <button
        onClick={handleSend}
        disabled={loading || (!hasClientId && !hasContactId)}
        className="inline-flex items-center px-6 py-2.5 bg-[#25D366] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#1DA851] transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
        {loading ? "Enviando..." : "Enviar por WA (IA)"}
      </button>

      <ConfirmationModal
        isOpen={templatePrompt !== null}
        onClose={() => setTemplatePrompt(null)}
        onConfirm={send}
        isLoading={loading}
        variant="warning"
        title="Pasaron más de 24 horas"
        message={`${templatePrompt ?? ""} WhatsApp ya no deja mandar mensajes normales, así que la cotización se enviará con la plantilla aprobada (Meta cobra este tipo de mensaje). El bot no le escribirá hasta que el cliente conteste. ¿Enviar?`}
        confirmText="Enviar con plantilla"
      />
    </>
  );
}
