import type { ParsedStatement, PdfPage } from "@/types/bank-statement";
import { parseBbvaStatement } from "./bbva";

/**
 * Lee un estado de cuenta en PDF ya convertido a texto con coordenadas.
 * Cada banco imprime distinto, así que hay un lector por banco; hoy: BBVA.
 */
export function parseStatementPages(pages: PdfPage[]): ParsedStatement {
  const text = pages.flat().map((i) => i.text).join(" ");
  if (/BBVA/i.test(text) && /Detalle\s+de\s+Movimientos/i.test(text)) return parseBbvaStatement(pages);
  throw new Error("Este formato de banco todavía no está soportado. Por ahora se leen estados de cuenta BBVA; para otros bancos sube el CSV.");
}
