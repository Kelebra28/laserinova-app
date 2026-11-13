import React, { useEffect, useRef } from 'react';

interface EmailBodyViewerProps {
  html?: string;
  text?: string;
}

const escapeHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Texto plano → HTML. Lo citado ("El … escribió:" y líneas con ">") va dentro de un <blockquote>
 * para poder plegarlo igual que en un correo HTML.
 */
function plainTextToHtml(text: string) {
  const lines = text.replace(/\r/g, '').split('\n');
  let cut = lines.findIndex((l) => /^\s*(El .{5,200}escribió:?|On .{5,200}wrote:?|-{2,}\s*(Original|Mensaje))/i.test(l));
  if (cut === -1) cut = lines.findIndex((l) => /^\s*>/.test(l));
  const own = (cut === -1 ? lines : lines.slice(0, cut)).join('\n');
  const quoted = cut === -1 ? '' : lines.slice(cut).join('\n');
  return (
    `<div style="white-space: pre-wrap; word-break: break-word;">${escapeHtml(own)}</div>` +
    (quoted ? `<blockquote style="white-space: pre-wrap; word-break: break-word;">${escapeHtml(quoted)}</blockquote>` : '')
  );
}

/**
 * Pliega el historial citado detrás de un botón "···" (como Gmail). Solo si hay contenido propio antes
 * de la cita; un correo que ES una cita completa (p. ej. un reenvío) se deja entero.
 */
function collapseQuotes(doc: Document, onToggle: () => void) {
  const all = Array.from(doc.querySelectorAll('.gmail_quote, blockquote[type="cite"], .yahoo_quoted, #appendonsend, #divRplyFwdMsg, blockquote')) as HTMLElement[];
  const tops = all.filter((el) => !el.parentElement?.closest('blockquote, .gmail_quote, .yahoo_quoted'));
  if (!tops.length) return;
  const first = tops[0];

  // El encabezado "El … escribió:" que va justo antes de la cita se pliega con ella
  let start: HTMLElement = first;
  const prev = first.previousElementSibling as HTMLElement | null;
  if (prev && /escribi[oó]:|wrote:/i.test(prev.textContent || '') && (prev.textContent || '').length < 400) start = prev;

  const range = doc.createRange();
  range.setStart(doc.body, 0);
  range.setEndBefore(start);
  if (!range.toString().trim()) return;

  const hidden = [start, ...tops.filter((t) => t !== start && !start.contains(t))];
  hidden.forEach((el) => { el.style.display = 'none'; });

  const btn = doc.createElement('button');
  btn.type = 'button';
  btn.title = 'Mostrar u ocultar el texto citado';
  btn.textContent = '···';
  btn.setAttribute('style', 'border:0;background:#f1f5f9;color:#64748b;border-radius:999px;padding:0 16px;height:30px;line-height:18px;font-size:18px;cursor:pointer;margin:8px 0;');
  btn.onclick = () => {
    const show = hidden[0].style.display === 'none';
    hidden.forEach((el) => { el.style.display = show ? '' : 'none'; });
    onToggle();
  };
  start.parentElement?.insertBefore(btn, start);
}

export function EmailBodyViewer({ html, text }: EmailBodyViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const content = html ? html : plainTextToHtml(text || '');

    // Estilos base: tamaño legible y que nada se salga del ancho (celular)
    const baseStyles = `
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 14.5px;
          line-height: 1.6;
          color: #334155;
          background-color: #ffffff;
          margin: 0;
          padding: 4px 0;
          word-wrap: break-word;
          overflow-x: hidden;
          max-width: 100%;
        }
        p { margin-top: 0; margin-bottom: 1em; }
        img { max-width: 100% !important; height: auto !important; display: block; margin: 1em 0; }
        table { max-width: 100% !important; }
        a { color: #dc2626; text-decoration: underline; }
        blockquote {
          margin: 1em 0;
          padding-left: 1em;
          border-left: 3px solid #cbd5e1;
          color: #64748b;
        }
      </style>
    `;

    const fullContent = `<!DOCTYPE html><html><head>${baseStyles}</head><body>${content}</body></html>`;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;

    // La altura sigue al contenido en ambos sentidos: se pone en 0 antes de medir, si no el alto actual del
    // iframe cuenta como "contenido" y nunca se encoge (dejaba un hueco al plegar el historial)
    const adjustHeight = () => {
      const htmlElement = doc?.documentElement;
      if (htmlElement && iframe) {
        iframe.style.height = '0px';
        iframe.style.height = `${htmlElement.scrollHeight + 12}px`;
      }
    };

    if (doc) {
      doc.open();
      doc.write(fullContent);
      doc.close();
      collapseQuotes(doc, adjustHeight);
    }

    // Delay slightly to allow internal media / tables to layout
    const timeoutId = setTimeout(adjustHeight, 200);
    iframe.addEventListener('load', adjustHeight);

    return () => {
      clearTimeout(timeoutId);
      iframe.removeEventListener('load', adjustHeight);
    };
  }, [html, text]);

  // Sin borde ni sombra propios: ya va dentro de la tarjeta del mensaje (antes eran cajas dentro de cajas)
  return (
    <div className="w-full bg-white">
      <iframe
        ref={iframeRef}
        title="Contenido del Correo"
        className="w-full min-h-[40px] border-none block bg-white"
        sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
