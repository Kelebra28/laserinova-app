export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDraft } from '@/lib/email-drafts';
import { buildEmailBodies } from '@/lib/email-compose';

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Vista previa de cómo llegaría el borrador (mismo armado que el envío real: texto, firma y cita). */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response('Unauthorized', { status: 401 });
  const d = await getDraft((session.user as any).id, id);
  if (!d) return new Response('Borrador no encontrado', { status: 404 });

  const { html } = buildEmailBodies({
    text: d.text,
    quoteHeader: d.quoteHeader,
    quoteBody: d.quoteBody,
    sig: { name: 'Ricardo Basurto', title: 'Director General', phone: '', email: 'info@laserinova.com', web: 'www.laserinova.com' },
    logoSrc: '/logo_pdf.png',
  });

  const page = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vista previa</title></head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:640px;margin:24px auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
  <div style="padding:14px 20px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;line-height:1.7">
    <div><b>De:</b> Ricardo Basurto &lt;ricardob@laserinova.com&gt;</div>
    <div><b>Para:</b> ${esc(d.to)}</div>
    <div><b>Asunto:</b> ${esc(d.subject)}</div>
  </div>
  <div style="padding:20px">${html}</div>
</div></body></html>`;
  return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
