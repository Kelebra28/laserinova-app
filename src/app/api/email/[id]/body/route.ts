export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadEmailFromDisk, saveEmailToDisk } from '@/lib/emailStorage';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';

const IMAP_FOLDERS: Record<string, string> = {
  INBOX: 'INBOX',
  SENT: 'INBOX.Sent',
  SPAM: 'INBOX.Junk',
  TRASH: 'INBOX.Trash'
};

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const currentUserId = (session.user as any).id;

    // 1. Obtener el correo de la DB
    const targetEmail = await prisma.email.findFirst({
      where: { id, userId: currentUserId },
      include: { attachments: true },
    });

    if (!targetEmail) {
      return NextResponse.json({ success: false, error: 'Email not found' }, { status: 404 });
    }

    // 2. Si ya está descargado, leer de caché local
    if (targetEmail.storagePath) {
      const disk = loadEmailFromDisk(targetEmail.storagePath);
      if (disk && (disk.html || disk.text)) {
        return NextResponse.json({ success: true, thread: [{ ...targetEmail, ...disk }] });
      }
    }

    // 3. Mock fallback
    const isMock = process.env.EMAIL_MOCK === 'true' || targetEmail.messageId.includes('mock') || (targetEmail.uid && targetEmail.uid < 0);
    if (isMock) {
       const mockBody = `<div style="padding:20px;font-family:sans-serif;">${targetEmail.snippet} <br><br> (Contenido Mock Simulado)</div>`;
       return NextResponse.json({
         success: true,
         thread: [{ ...targetEmail, html: mockBody, text: targetEmail.snippet || '' }]
       });
    }

    // 4. Descargar "On-Demand" directo desde IMAP usando UID
    if (!targetEmail.uid) {
       return NextResponse.json({ success: false, error: 'Email no tiene UID para descargar.' }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: currentUserId } });
    let user = dbUser?.email || '';
    let pass = '';
    let host = dbUser?.emailIncomingServer || 'imap.hostinger.com';

    if (dbUser?.emailPasswordEncrypted) {
      try { pass = decrypt(dbUser.emailPasswordEncrypted); } catch { /* ignore */ }
    }
    if (!pass) {
      user = process.env.SMTP_USER || '';
      pass = process.env.SMTP_PASS || '';
      host = process.env.SMTP_HOST?.replace('smtp', 'imap') || 'imap.hostinger.com';
    }

    if (user && pass) {
      const client = new ImapFlow({
        host, port: 993, secure: true,
        auth: { user, pass },
        logger: false, connectionTimeout: 8000,
      });

      try {
        await client.connect();
        const folderName = IMAP_FOLDERS[targetEmail.folder] || 'INBOX';
        const lock = await client.getMailboxLock(folderName);
        
        try {
          const fetchResult = await client.fetchOne(targetEmail.uid.toString(), { source: true }, { uid: true }) as any;
          
          if (fetchResult && fetchResult.source) {
            const parsed = await simpleParser(fetchResult.source as Buffer);
            const html = parsed.html || (parsed.text ? `<p style="white-space:pre-wrap">${parsed.text}</p>` : '');
            const text = parsed.text || '';
            
            // Guardar adjuntos si existen y no se guardaron antes
            if (parsed.attachments && parsed.attachments.length > 0 && targetEmail.attachments.length === 0) {
               await prisma.attachment.createMany({
                 data: parsed.attachments.map(att => ({
                   emailId: targetEmail.id,
                   filename: att.filename || 'adjunto',
                   mimeType: att.contentType || 'application/octet-stream',
                   size: att.size || 0,
                   contentId: att.contentId,
                 })),
               });
               // Recargar targetEmail para incluir los nuevos adjuntos
               const updatedAttachments = await prisma.attachment.findMany({ where: { emailId: targetEmail.id } });
               targetEmail.attachments = updatedAttachments;
            }

            // Guardar HTML a disco usando el ID único de BD
            const savedPath = saveEmailToDisk(targetEmail.id, html, text);
            await prisma.email.update({ where: { id: targetEmail.id }, data: { storagePath: savedPath } });

            return NextResponse.json({ success: true, thread: [{ ...targetEmail, html, text }] });
          }
        } finally {
          lock.release();
        }
      } catch (err: any) {
        console.warn('IMAP On-Demand fetch error:', err.message);
      } finally {
        try { await client.logout(); } catch { /* ignore */ }
      }
    }

    // 5. Último recurso (Fallback de Snippet)
    const snippetHtml = `<div style="font-family: sans-serif; padding: 16px; border-left: 3px solid #e2e8f0; color: #64748b;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8;">No se pudo conectar a IMAP para descargar el cuerpo completo.</p>
      <p style="margin:0; white-space: pre-wrap;">${targetEmail.snippet || 'Sin contenido disponible.'}</p>
    </div>`;

    return NextResponse.json({
      success: true,
      thread: [{ ...targetEmail, html: snippetHtml, text: targetEmail.snippet || '' }]
    });

  } catch (error: any) {
    console.error('[NUEVO] Email body fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
