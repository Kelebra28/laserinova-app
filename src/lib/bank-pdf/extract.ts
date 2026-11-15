import { getDocumentProxy } from "unpdf";
import { PDF_MAX_PAGES } from "@/constants/reconciliation.constants";
import type { PdfPage, PdfTextItem } from "@/types/bank-statement";

/**
 * PDF → texto con coordenadas, página por página (x de izquierda a derecha, y de arriba hacia abajo).
 * Es la única pieza que depende de la librería de PDF; los lectores por banco trabajan sobre su resultado.
 */
export async function extractPdfPages(data: Uint8Array): Promise<PdfPage[]> {
  // La librería "consume" los bytes que recibe: se le pasa una copia para no dañar los del llamador.
  const pdf = await getDocumentProxy(new Uint8Array(data));
  try {
    if (pdf.numPages > PDF_MAX_PAGES) throw new Error(`El PDF tiene ${pdf.numPages} páginas (máximo ${PDF_MAX_PAGES}). Sube un solo mes.`);

    const pages: PdfPage[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const height = page.getViewport({ scale: 1 }).height;
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      for (const it of content.items) {
        if (!("str" in it) || !it.str.trim()) continue;
        const [, , , , x, y] = it.transform as number[];
        items.push({ text: it.str, x0: x, x1: x + it.width, y: height - y });
      }
      pages.push(items);
    }
    return pages;
  } finally {
    await pdf.cleanup();
  }
}
