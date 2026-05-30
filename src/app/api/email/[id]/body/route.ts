import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadEmailFromDisk, saveEmailToDisk, getStorageBasePath } from '@/lib/emailStorage';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { decrypt } from '@/lib/encryption';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const email = await prisma.email.findUnique({
      where: { id },
      select: { id: true, messageId: true, subject: true, snippet: true, folder: true, storagePath: true }
    });

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email not found' }, { status: 404 });
    }

    // 1. Try to load from disk first
    if (email.storagePath) {
      try {
        const basePath = getStorageBasePath();
        const htmlPath = path.join(basePath, email.storagePath, 'body.html');
        const txtPath = path.join(basePath, email.storagePath, 'body.txt');
        if (fs.existsSync(htmlPath) && fs.existsSync(txtPath)) {
          const { html, text } = loadEmailFromDisk(email.storagePath);
          return NextResponse.json({ success: true, html, text });
        }
      } catch (diskError) {
        console.warn('Failed to read from storagePath, falling back to network/mock:', diskError);
      }
    }

    // 2. Fallback: Mock Mode
    const isMockForced = process.env.EMAIL_MOCK === 'true';
    if (isMockForced) {
      const generatedHtml = `<div style="font-family: sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6;">
        <p><strong>[Modo Demo]</strong> Este correo no se encuentra en el disco local.</p>
        <p>Asunto: ${email.subject}</p>
        <p>${email.snippet || 'Sin contenido adicional disponible en modo de prueba.'}</p>
      </div>`;
      const generatedText = email.snippet || 'Modo Demo - Sin contenido.';
      return NextResponse.json({ success: true, html: generatedHtml, text: generatedText });
    }

    // 3. Fallback: Dynamic Fetch from Hostinger IMAP on-demand
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized for network fetch' }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    let imapUser = dbUser?.email || '';
    let imapPass = '';
    let imapHost = dbUser?.emailIncomingServer || 'imap.hostinger.com';

    if (dbUser?.emailPasswordEncrypted) {
      try {
        imapPass = decrypt(dbUser.emailPasswordEncrypted);
      } catch (e) {
        console.error("Failed to decrypt user email password inside fallback GET", e);
      }
    }

    if (!imapPass) {
      imapUser = process.env.SMTP_USER || '';
      imapPass = process.env.SMTP_PASS || '';
      imapHost = process.env.SMTP_HOST?.replace('smtp', 'imap') || 'imap.hostinger.com';
    }

    if (!imapUser || !imapPass) {
      return NextResponse.json({ success: false, error: 'Configuración IMAP incompleta para descarga en vivo' }, { status: 400 });
    }

    const client = new ImapFlow({
      host: imapHost,
      port: 993,
      secure: true,
      auth: { user: imapUser, pass: imapPass },
      logger: false,
      connectionTimeout: 8000,
    });

    await client.connect();

    let html = '';
    let text = '';

    try {
      // Map CRM folder to IMAP folder names
      const imapFolder = email.folder === 'SENT' ? 'INBOX.Sent' : 'INBOX';
      
      try {
        const lock = await client.getMailboxLock(imapFolder);
        try {
          // Search for the message by messageId
          const searchCriteria = { header: { 'message-id': email.messageId } };
          const messageIds = await client.search(searchCriteria);

          if (messageIds && messageIds.length > 0) {
            const fetchResult = await client.fetchOne(messageIds[0], { source: true });
            if (fetchResult && fetchResult.source) {
              const parsed = await simpleParser(fetchResult.source);
              html = parsed.html || `<p>${parsed.text?.replace(/\n/g, '<br>') || ''}</p>`;
              text = parsed.text || '';

              // Save back to disk asynchronously (silently ignoring storage errors on serverless Vercel)
              try {
                const savedPath = saveEmailToDisk(email.messageId, html, text);
                await prisma.email.update({
                  where: { id: email.id },
                  data: { storagePath: savedPath }
                });
              } catch (writeErr) {
                console.warn('Could not persist fetched email body to server disk (normal on serverless Vercel):', writeErr);
              }
            }
          }
        } finally {
          lock.release();
        }
      } catch (imapErr: any) {
        console.warn('IMAP Search/Fetch failed for folder', imapFolder, ':', imapErr.message);
      }
    } catch (err: any) {
      console.warn('IMAP connection or lock failed:', err.message);
    }

    await client.logout();

    if (!html && !text) {
      return NextResponse.json({ 
        success: true, 
        html: `<div style="font-family: sans-serif; padding: 12px; border: 1px solid #ef4444; background: #fef2f2; color: #b91c1c; border-radius: 8px;">
          <strong>Error de descarga:</strong> No pudimos obtener el contenido de este correo desde el servidor de Hostinger.
        </div>`,
        text: 'Error al descargar desde Hostinger IMAP.'
      });
    }

    return NextResponse.json({ success: true, html, text });
  } catch (error: any) {
    console.error('Email body fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
