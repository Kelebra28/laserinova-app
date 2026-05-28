import React, { useEffect, useRef } from 'react';

interface EmailBodyViewerProps {
  html?: string;
  text?: string;
}

export function EmailBodyViewer({ html, text }: EmailBodyViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Prepare content with injection of standard CSS styles for contrast and responsiveness
    let content = '';
    if (html) {
      content = html;
    } else {
      // Wrap plain text in simple styling
      content = `<div style="white-space: pre-wrap; word-break: break-word;">${text || ''}</div>`;
    }

    // Inject base styles to avoid light gray text or tiny font-size deforming the layout
    const baseStyles = `
      <style>
        body {
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #1e293b !important; /* Dark Slate to ensure high contrast */
          background-color: #ffffff !important;
          margin: 0;
          padding: 8px;
          word-break: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
        }
        /* Override light gray text colors inside parsed emails */
        p, span, div, td, h1, h2, h3, h4, h5, h6, a {
          color: #1e293b !important; /* Force dark text for readability */
        }
        a {
          color: #ef4444 !important; /* Red links to match brand */
          text-decoration: underline;
        }
        img {
          max-width: 100% !important;
          height: auto !important;
        }
        table {
          max-width: 100% !important;
          width: 100% !important;
          border-collapse: collapse !important;
        }
      </style>
    `;

    const fullContent = `
      <!DOCTYPE html>
      <html>
        <head>
          ${baseStyles}
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;

    // Write content directly to the iframe document to avoid frame restrictions
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(fullContent);
      doc.close();
    }

    // Auto-adjust iframe height to match content height
    const adjustHeight = () => {
      const body = doc?.body;
      const htmlElement = doc?.documentElement;
      if (body && htmlElement && iframe) {
        const height = Math.max(
          body.scrollHeight,
          body.offsetHeight,
          htmlElement.clientHeight,
          htmlElement.scrollHeight,
          htmlElement.offsetHeight
        );
        iframe.style.height = `${height + 20}px`;
      }
    };

    // Delay slightly to allow internal media / tables to layout
    const timeoutId = setTimeout(adjustHeight, 200);

    // Also register on load just in case
    iframe.addEventListener('load', adjustHeight);

    return () => {
      clearTimeout(timeoutId);
      iframe.removeEventListener('load', adjustHeight);
    };
  }, [html, text]);

  return (
    <div className="w-full border border-slate-100 rounded-xl overflow-hidden bg-white shadow-inner">
      <iframe
        ref={iframeRef}
        title="Contenido del Correo"
        className="w-full min-h-[250px] border-none block bg-white"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
