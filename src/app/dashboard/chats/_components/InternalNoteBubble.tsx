import Link from 'next/link';
import { Bot, FileText } from 'lucide-react';
import { parseInternalMessage } from '@/lib/whatsapp/internal-message';

/**
 * Nota interna del sistema (no la ve el cliente). Si trae una cotización ya creada muestra "Ver Cotización";
 * los borradores del bot no llevan botón aquí: se generan desde "Generar cotización" en la cabecera.
 */
export function InternalNoteBubble({ content }: { content: string | null | undefined }) {
  const { text, link } = parseInternalMessage(content);
  return (
    <div className="flex justify-center w-full my-2">
      <div className="bg-amber-400/[0.07] border border-amber-400/20 text-amber-100/90 px-4 py-2.5 rounded-xl text-[13px] max-w-[90%] md:max-w-[75%] shadow-sm">
        <div className="font-semibold mb-1 flex items-center gap-1.5 text-amber-300 text-xs uppercase tracking-wide">
          <Bot size={13} /> Nota interna · Sistema
        </div>
        <p className="whitespace-pre-wrap text-left break-words">{text}</p>
        {link?.kind === 'quote' && (
          <Link
            href={`/dashboard/quotes/${link.quoteId}`}
            className="mt-2 inline-flex items-center gap-1.5 bg-amber-400/15 hover:bg-amber-400/25 text-amber-200 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
          >
            <FileText size={14} /> Ver Cotización
          </Link>
        )}
      </div>
    </div>
  );
}
