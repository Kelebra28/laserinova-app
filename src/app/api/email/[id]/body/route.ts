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

function normalizeSubject(subj: string): string {
  return subj
    .replace(/^(Re|Re:|re|RE|Re\^\[\d+\]:|Fwd|Fwd:|fwd|RV|RV:|rv|Rv:)\s+/i, '')
    .trim();
}

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const currentUserId = (session.user as any).id;

    const targetEmail = await prisma.email.findFirst({
      where: { id, userId: currentUserId },
      select: { id: true, messageId: true, subject: true, snippet: true, folder: true, storagePath: true, from: true, to: true, receivedAt: true }
    });

    if (!targetEmail) {
      return NextResponse.json({ success: false, error: 'Email not found' }, { status: 404 });
    }

    // Normalize subject to find the thread
    const cleanSubj = normalizeSubject(targetEmail.subject);

    // Find all related emails in DB that share the same normalized subject
    let relatedEmails: any[] = [];
    
    if (!cleanSubj || cleanSubj.trim().length < 3) {
      // Si el asunto está vacío o es muy corto, mejor no intentar agrupar hilos para evitar mezclar correos.
      relatedEmails = [targetEmail];
    } else {
      // Buscamos candidatos amplios pero filtramos estrictamente en memoria
      const candidates = await prisma.email.findMany({
        where: {
          userId: currentUserId,
          subject: { contains: cleanSubj }
        },
        include: { attachments: true },
        orderBy: { receivedAt: 'asc' }
      });
      
      relatedEmails = candidates.filter(em => {
        const norm = normalizeSubject(em.subject);
        // Filtrado estricto: debe coincidir exactamente el asunto normalizado
        return norm.toLowerCase() === cleanSubj.toLowerCase();
      });
      
      // Asegurarnos de que el targetEmail siempre esté incluido aunque algo falle
      if (!relatedEmails.find(e => e.id === targetEmail.id)) {
        relatedEmails.push(targetEmail);
      }
    }

    // Helper to get body for a single email
    const getEmailContent = async (emailRecord: any) => {
      // 1. Try disk
      if (emailRecord.storagePath) {
        try {
          const basePath = getStorageBasePath();
          const htmlPath = path.join(basePath, emailRecord.storagePath, 'body.html');
          const txtPath = path.join(basePath, emailRecord.storagePath, 'body.txt');
          if (fs.existsSync(htmlPath) && fs.existsSync(txtPath)) {
            return loadEmailFromDisk(emailRecord.storagePath);
          }
        } catch (e) {
          console.warn('Failed disk read', e);
        }
      }
      // 2. Try mock
      const isMockForced = process.env.EMAIL_MOCK === 'true';
      if (isMockForced || emailRecord.messageId.includes('mock')) {
        const html = `<div style="font-family: sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6;">
          <p>${emailRecord.snippet || 'Sin contenido adicional (Modo Demo).'}</p>
        </div>`;
        return { html, text: emailRecord.snippet || '' };
      }
      return null;
    };

    // Load bodies for all emails in the thread
    const thread: any[] = [];
    let needsNetworkFetch = false;
    const missingEmailRecords: any[] = [];

    for (const em of relatedEmails) {
      const content = await getEmailContent(em);
      if (content) {
        thread.push({ ...em, ...content });
      } else {
        needsNetworkFetch = true;
        missingEmailRecords.push(em);
      }
    }

    // If there are missing bodies, fetch them from IMAP
    if (needsNetworkFetch) {
      const session = await getServerSession(authOptions);
      if (session && session.user) {
        const currentUserId = (session.user as any).id;
        const dbUser = await prisma.user.findUnique({ where: { id: currentUserId } });
        
        let imapUser = dbUser?.email || '';
        let imapPass = '';
        let imapHost = dbUser?.emailIncomingServer || 'imap.hostinger.com';

        if (dbUser?.emailPasswordEncrypted) {
          try {
            imapPass = decrypt(dbUser.emailPasswordEncrypted);
          } catch (e) {
            console.error("Failed decrypt", e);
          }
        }

        if (!imapPass) {
          imapUser = process.env.SMTP_USER || '';
          imapPass = process.env.SMTP_PASS || '';
          imapHost = process.env.SMTP_HOST?.replace('smtp', 'imap') || 'imap.hostinger.com';
        }

        if (imapUser && imapPass) {
          const client = new ImapFlow({
            host: imapHost,
            port: 993,
            secure: true,
            auth: { user: imapUser, pass: imapPass },
            logger: false,
            connectionTimeout: 6000,
          });

          try {
            await client.connect();

            for (const em of missingEmailRecords) {
              const imapFolder = em.folder === 'SENT' ? 'INBOX.Sent' : 'INBOX';
              let html = '';
              let text = '';

              try {
                const lock = await client.getMailboxLock(imapFolder);
                try {
                  // Limpiamos los brackets para la búsqueda, algunos servidores IMAP son sensibles a esto
                  const cleanMessageId = em.messageId.replace(/^<|>$/g, '');
                  
                  // Intentamos buscar con y sin brackets
                  let searchResult = await client.search({ header: { 'message-id': em.messageId } });
                  if (!searchResult || searchResult.length === 0) {
                    searchResult = await client.search({ header: { 'message-id': cleanMessageId } });
                  }
                  
                  // Fallback 1: Búsqueda por Asunto exacto
                  let cleanSubjForSearch = '';
                  if (!searchResult || searchResult.length === 0) {
                    cleanSubjForSearch = em.subject.replace(/^(Re|Fwd|Rv|FW|RE|RV|Fw)\s*:\s*/i, '').trim();
                    if (cleanSubjForSearch) {
                      searchResult = await client.search({ header: { subject: cleanSubjForSearch } });
                    }
                  }
                  
                  // Fallback 2: Búsqueda por primera palabra clave larga del asunto (Hostinger falla con caracteres especiales como //)
                  if (!searchResult || searchResult.length === 0) {
                    const words = cleanSubjForSearch.split(/[\s\/\\:-]+/).filter(w => w.length > 5);
                    if (words.length > 0) {
                      searchResult = await client.search({ header: { subject: words[0] } });
                    }
                  }

                  // Fallback 3: Búsqueda por remitente (From)
                  if (!searchResult || searchResult.length === 0) {
                    if (em.from) {
                      const fromEmailMatch = em.from.match(/<([^>]+)>/);
                      const fromEmail = fromEmailMatch ? fromEmailMatch[1] : em.from;
                      if (fromEmail) {
                        searchResult = await client.search({ from: fromEmail });
                      }
                    }
                  }
                  
                  if (searchResult && searchResult.length > 0) {
                    for (const uid of searchResult) {
                      const fetchResult = await client.fetchOne(uid, { source: true });
                      if (fetchResult && fetchResult.source) {
                        const parsed = await simpleParser(fetchResult.source);
                        const parsedId = parsed.messageId || '';
                        const idMatches = parsedId === em.messageId || parsedId === cleanMessageId || `<${parsedId}>` === em.messageId;
                        
                        if (idMatches) {
                          html = parsed.html || `<p>${parsed.text?.replace(/\n/g, '<br>') || ''}</p>`;
                          text = parsed.text || '';

                          try {
                            const savedPath = saveEmailToDisk(em.messageId, html, text);
                            await prisma.email.update({
                              where: { id: em.id },
                              data: { storagePath: savedPath }
                            });
                          } catch (writeErr) {
                            console.warn('Could not persist', writeErr);
                          }
                          break;
                        }
                      }
                    }
                  }

                } finally {
                  lock.release();
                }
              } catch (folderErr) {
                console.warn('Folder search failed', folderErr);
              }

              if (html || text) {
                thread.push({ ...em, html, text });
              } else {
                // Fallback to snippet
                thread.push({
                  ...em,
                  html: `<div style="font-family: sans-serif; padding: 12px; border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; border-radius: 8px;">
                    <p style="margin:0 0 8px 0; font-weight:bold;">✉️ Detalle del correo</p>
                    <p style="margin:0; font-style:italic;">${em.snippet || 'Sin contenido disponible offline.'}</p>
                  </div>`,
                  text: em.snippet || ''
                });
              }
            }

            await client.logout();
          } catch (connErr) {
            console.warn('IMAP connection failed during thread fetch', connErr);
          }
        }
      }
    }

    // Fallback if thread is completely empty (though targetEmail should at least be in it)
    if (thread.length === 0) {
      thread.push({
        ...targetEmail,
        html: `<div style="font-family: sans-serif; padding: 24px; border: 1px solid #fca5a5; background: #fef2f2; color: #991b1b; border-radius: 16px; max-width: 460px; margin: 40px auto; text-align: center; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.05);">
          <div style="font-size: 28px; margin-bottom: 12px;">⚠️</div>
          <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #7f1d1d; text-transform: uppercase; letter-spacing: 0.5px;">Correo no encontrado</h4>
          <p style="margin: 0 0 20px 0; font-size: 12px; line-height: 1.6; color: #b91c1c;">
            No se pudo descargar el contenido de este correo desde el servidor de Hostinger.
          </p>
        </div>`,
        text: 'Error al descargar desde Hostinger IMAP.'
      });
    }

    // Sort thread chronologically to make sure it's correct
    thread.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

    return NextResponse.json({ success: true, thread });
  } catch (error: any) {
    console.error('Thread fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
