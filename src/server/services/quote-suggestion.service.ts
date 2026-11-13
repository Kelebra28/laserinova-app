import { prisma } from "@/lib/prisma";
import { updateQuoteStatusService } from "@/server/services/quote.service";

/**
 * El bot SOLO sugiere (nota interna con botones); la persona confirma. Aceptar una cotización descuenta
 * inventario y empieza a contar como venta y por cobrar, así que nunca se hace sola.
 *
 * Formato de la nota: `texto|||SUGGEST:<ACCEPT|REJECT>:<quoteId>`; ya resuelta: `texto|||SUGGEST_DONE:<resultado>`.
 */
export type SuggestionDecision = "ACCEPT" | "REJECT";

export function suggestionTag(decision: SuggestionDecision, quoteId: string) {
  return `|||SUGGEST:${decision}:${quoteId}`;
}

export async function resolveQuoteSuggestion(messageId: string, action: "CONFIRM" | "DISMISS") {
  const msg = await prisma.whatsAppMessage.findUnique({ where: { id: messageId }, select: { id: true, direction: true, content: true } });
  const [text, tag] = (msg?.content || "").split("|||");
  const m = msg?.direction === "INTERNAL" ? /^SUGGEST:(ACCEPT|REJECT):(.+)$/.exec(tag || "") : null;
  if (!msg || !m) throw new Error("Esta sugerencia ya no está disponible.");
  const decision = m[1] as SuggestionDecision;
  const quoteId = m[2];

  let outcome = "Descartada";
  if (action === "CONFIRM") {
    const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { status: true, folio: true } });
    if (!quote) {
      outcome = "La cotización ya no existe";
    } else if (quote.status !== "SENT") {
      // Alguien ya la movió a mano: no se pisa.
      outcome = `Sin cambios: ya estaba en «${quote.status}»`;
    } else {
      await updateQuoteStatusService(quoteId, decision === "ACCEPT" ? "APPROVED" : "REJECTED");
      outcome = decision === "ACCEPT" ? `Confirmada: ${quote.folio} aceptada` : `Confirmada: ${quote.folio} rechazada`;
    }
  }

  const content = `${text}|||SUGGEST_DONE:${outcome}`;
  await prisma.whatsAppMessage.update({ where: { id: messageId }, data: { content } });
  return { content, outcome };
}
