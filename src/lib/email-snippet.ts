import { simpleParser } from "mailparser";

/** Texto que se guardaba antes de tener vista previa; sirve para detectar los correos que aún no la tienen. */
export const SNIPPET_PLACEHOLDER = "Abre el correo para ver el contenido...";

export function stripHtml(html: string) {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

/**
 * Primeras líneas legibles del correo: sin citas (">"), sin el "El … escribió:" de respuestas, sin enlaces
 * larguísimos ni espacios de más. Tolera cuerpos cortados a la mitad (solo se baja el inicio del mensaje).
 */
export function snippetFromText(raw: string, max = 160): string {
  const lines: string[] = [];
  for (const line of raw.replace(/\r/g, "").split("\n")) {
    if (/^\s*(El .{5,120} escribió:?|On .{5,120} wrote:?|-{2,}\s*(Original|Mensaje|Forwarded))/i.test(line)) break;
    if (/^\s*>/.test(line)) continue;
    lines.push(line);
  }
  let text = lines
    .join(" ")
    .replace(/https?:\/\/\S{40,}/g, "[enlace]")
    .replace(/\s+/g, " ")
    .trim();
  // Encabezados de cita partidos en varias líneas ("El vie, 13 de nov… <correo> escribió:"): se corta desde ahí
  text = text.replace(/(^|\s)(El|On)\s(?:El\s)?.{5,200}?\s(escribió|wrote):.*$/i, "").trim();
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

/** Vista previa a partir del correo crudo (o de su primera parte). */
export async function makeSnippet(source: Buffer): Promise<string> {
  try {
    const parsed = await simpleParser(source);
    const text = parsed.text || (typeof parsed.html === "string" ? stripHtml(parsed.html) : "");
    return snippetFromText(text) || (parsed.attachments?.length ? "(Solo adjuntos)" : "(Sin texto)");
  } catch {
    return "(Sin vista previa)";
  }
}
