export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadEmailFromDisk, saveEmailToDisk, getStorageBasePath } from '@/lib/emailStorage';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import fs from 'fs';
import path from 'path';

function readBodyFromDisk(storagePath: string): { html: string; text: string } | null {
  try {
    const basePath = getStorageBasePath();
    const htmlPath = path.join(basePath, storagePath, 'body.html');
    const txtPath = path.join(basePath, storagePath, 'body.txt');
    if (!fs.existsSync(htmlPath) && !fs.existsSync(txtPath)) return null;
    const result = loadEmailFromDisk(storagePath);
    if (!result.html && !result.text) return null;
    return result;
  } catch {
    return null;
  }
}

async function fetchBodyFromImap(
  em: { id: string; messageId: string; subject: string; folder: string; from: string },
  cfg: { host: string; user: string; pass: string }
): Promise<{ html: string; text: string } | null> {
  const client = new ImapFlow({
    host: cfg.host,
    port: 993,
    secure: true,
    auth: { user: cfg.user, pass: cfg.pass },
    logger: false,
    connectionTimeout: 8000,
  });

  try {
    await client.connect();
    const cleanMsgId = em.messageId.replace(/^<|>$/g, '');
    const foldersToTry = em.folder === 'SENT' ? ['INBOX.Sent', 'INBOX'] : ['INBOX', 'INBOX.Sent'];

    for (const folder of foldersToTry) {
      try {
        const lock = await client.getMailboxLock(folder);
        try {
          let uids = await client.search({ header: { 'message-id': em.messageId } });
          if (!uids || uids.length === 0) {
            uids = await client.search({ header: { 'message-id': cleanMsgId } });
          }
          if (uids && uids.length > 0) {
            const fetchResult = await client.fetchOne(uids[0], { source: true }) as any;
            if (fetchResult && fetchResult.source) {
              const parsed = await simpleParser(fetchResult.source as Buffer);
              const html = parsed.html || (parsed.text ? `<p style="white-space:pre-wrap">${parsed.text}</p>` : '');
              const text = parsed.text || '';
              if (html || text) {
                try {
                  const savedPath = saveEmailToDisk(em.messageId, html, text);
                  await prisma.email.update({ where: { id: em.id }, data: { storagePath: savedPath } });
                } catch { /* ignore write errors */ }
                return { html, text };
              }
            }
          }
        } finally {
          lock.release();
        }
      } catch (folderErr) {
        console.warn(`IMAP folder ${folder} error:`, folderErr);
      }
    }
    return null;
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }
}

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

    // Obtener SOLO el correo solicitado — sin agrupación de hilos que causa mezclas
    const targetEmail = await prisma.email.findFirst({
      where: { id, userId: currentUserId },
      include: { attachments: true },
    });

    if (!targetEmail) {
      return NextResponse.json({ success: false, error: 'Email not found' }, { status: 404 });
    }

    // 1. Leer del disco si fue guardado durante el sync
    if (targetEmail.storagePath) {
      const disk = readBodyFromDisk(targetEmail.storagePath);
      if (disk) {
        return NextResponse.json({ success: true, thread: [{ ...targetEmail, ...disk }] });
      }
    }

    // 2. Descargar de IMAP por messageId exacto (sin fallbacks contaminantes)
    const isMock = process.env.EMAIL_MOCK === 'true' || targetEmail.messageId.includes('mock');
    if (!isMock) {
      try {
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
          const imapContent = await fetchBodyFromImap(targetEmail, { host, user, pass });
          if (imapContent) {
            return NextResponse.json({ success: true, thread: [{ ...targetEmail, ...imapContent }] });
          }
        }
      } catch (err) {
        console.warn('IMAP fetch error for', targetEmail.messageId, err);
      }
    }

    // 3. Último recurso: snippet del correo correcto (nunca el de otro correo)
    const snippetHtml = `<div style="font-family: sans-serif; padding: 16px; border-left: 3px solid #e2e8f0; color: #64748b;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8;">Vista previa — Presiona Sincronizar para ver el contenido completo</p>
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
