/**
 * Arma el cuerpo final de un correo (HTML y texto plano): lo que escribiste, la firma y, si es una respuesta,
 * el historial como cita. Lo usa el envío real y la vista previa de los borradores, para que lo que se ve sea
 * exactamente lo que llega.
 */
export type EmailSignature = { name: string; title: string; phone: string; email: string; web: string };

export function buildEmailBodies(opts: {
  text: string;
  quoteHeader?: string;
  quoteBody?: string;
  sig: EmailSignature;
  logoSrc?: string; // 'cid:logo_pdf' al enviar (imagen incrustada); '/logo_pdf.png' en la vista previa
}) {
  const { text, quoteHeader = '', quoteBody = '' } = opts;
  const logoSrc = opts.logoSrc ?? 'cid:logo_pdf';
  const sigName = opts.sig.name, sigTitle = opts.sig.title, sigPhone = opts.sig.phone, sigEmail = opts.sig.email, sigWeb = opts.sig.web;
    const cleanPhone = sigPhone.replace(/\D/g, ''); // Extract only digits for whatsapp deep-link

    const signatureHtml = `
      <br><br>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <table style="font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.5; border-collapse: collapse;">
        <tr>
          <td colspan="2" style="padding-bottom: 12px;">
            <img src="${logoSrc}" alt="Laser Inova" style="height: 42px; display: block;">
          </td>
        </tr>
        <tr>
          <td style="vertical-align: middle; padding-right: 15px; border-right: 2px solid #ef4444;">
            <div style="font-weight: bold; font-size: 15px; color: #0f172a;">${sigName}</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 2px;">${sigTitle}</div>
          </td>
          <td style="vertical-align: middle; padding-left: 15px;">
${sigPhone ? `            <div style="margin-bottom: 4px;">
              <span style="font-weight: bold; color: #ef4444; font-size: 11px; text-transform: uppercase;">WhatsApp:</span> 
              <a href="https://wa.me/${cleanPhone}" style="color: #1e293b; text-decoration: none; font-weight: 500;">${sigPhone}</a>
            </div>` : ''}
            <div style="margin-bottom: 4px;">
              <span style="font-weight: bold; color: #ef4444; font-size: 11px; text-transform: uppercase;">Email:</span> 
              <a href="mailto:${sigEmail}" style="color: #1e293b; text-decoration: none; font-weight: 500;">${sigEmail}</a>
            </div>
            <div>
              <span style="font-weight: bold; color: #ef4444; font-size: 11px; text-transform: uppercase;">Web:</span> 
              <a href="https://${sigWeb.replace(/https?:\/\//, '')}" style="color: #1e293b; text-decoration: none; font-weight: 500;">${sigWeb}</a>
            </div>
          </td>
        </tr>
      </table>
    `;

    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Cita estilo correo: encabezado + bloque con barra lateral (no líneas con ">" pegadas al texto)
    const quoteHtml = quoteBody
      ? `<div style="margin-top: 24px; font-family: Arial, sans-serif; font-size: 12px; color: #64748b;">${esc(quoteHeader).replace(/\n/g, '<br>')}</div>` +
        `<blockquote style="margin: 8px 0 0; padding: 4px 0 4px 14px; border-left: 3px solid #cbd5e1; font-family: Arial, sans-serif; font-size: 13px; color: #475569; line-height: 1.5;">${esc(quoteBody).replace(/\n/g, '<br>')}</blockquote>`
      : '';
    // La firma va justo después de lo que escribiste y ANTES de la cita (antes quedaba al final y Gmail la escondía)
    const htmlBody = `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6;">${esc(text).replace(/\n/g, '<br>')}</div>` + signatureHtml + quoteHtml;
    const plainBody = quoteBody
      ? `${text}\n\n${quoteHeader}\n${quoteBody.split('\n').map((l) => `> ${l}`).join('\n')}`
      : text;

  return { html: htmlBody, plain: plainBody };
}
