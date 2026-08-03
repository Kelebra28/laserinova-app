import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';

function extractAddress(addrArray: any) {
  if (!addrArray || !Array.isArray(addrArray) || !addrArray.length) return '';
  return addrArray.map(a => `${a.name ? `"${a.name}" ` : ''}<${a.address}>`).join(', ');
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    let imapUser = dbUser?.email || '';
    let imapPass = '';
    let imapHost = dbUser?.emailIncomingServer || 'imap.hostinger.com';

    let decryptionFailed = false;
    let decryptionError = '';

    if (dbUser?.emailPasswordEncrypted) {
      try {
        imapPass = decrypt(dbUser.emailPasswordEncrypted);
        if (!imapPass) {
          decryptionFailed = true;
          decryptionError = 'Decrypted password is empty';
        }
      } catch (e: any) {
        decryptionFailed = true;
        decryptionError = e.message || 'Decryption threw an error';
        console.error("Failed to decrypt user email password, falling back to global", e);
      }
    }

    // Fallback to global env
    if (!imapPass) {
      imapUser = process.env.SMTP_USER || '';
      imapPass = process.env.SMTP_PASS || '';
      imapHost = process.env.SMTP_HOST?.replace('smtp', 'imap') || 'imap.hostinger.com';
    }

    const isMockForced = process.env.EMAIL_MOCK === 'true';
    if (isMockForced) {
      await insertMockEmails(currentUserId);
      return NextResponse.json({ success: true, message: 'Sync completed (Demo Mode)', mock: true });
    }

    if (!imapPass) {
      return NextResponse.json({
        success: false,
        message: 'No se encontraron credenciales de correo configuradas.',
        authError: true,
        decryptionFailed,
        decryptionError,
      }, { status: 401 });
    }

    try {
      let syncedCount = 0;
      let debugInfo: any = { imapUser, fallback: !dbUser?.emailPasswordEncrypted || decryptionFailed };
      const syncPromise = async () => {
        const client = new ImapFlow({
          host: imapHost,
          port: 993,
          secure: true,
          auth: { user: imapUser, pass: imapPass },
          logger: false,
          connectionTimeout: 8000,
        });

          await client.connect();

          const syncFolder = async (folderNames: string[], dbFolderName: string, maxCount: number) => {
            for (const folderName of folderNames) {
              try {
                const lock = await client.getMailboxLock(folderName);
                try {
                  const totalMessages = client.mailbox ? (client.mailbox as any).exists : 0;
                  debugInfo[folderName] = totalMessages;
                  if (totalMessages > 0) {
                    const startRange = Math.max(1, totalMessages - (maxCount - 1));
                    const messages = client.fetch(`${startRange}:*`, { uid: true, envelope: true, internalDate: true });
                    
                    const msgList = [];
                    for await (const msg of messages) {
                      msgList.push(msg);
                    }

                    // Process newest first
                    for (const msg of msgList.reverse()) {
                      if (!msg.uid) continue;

                      // Check if already in DB
                      const exists = await prisma.email.findUnique({
                        where: {
                          uid_folder_userId: {
                            uid: msg.uid,
                            folder: dbFolderName,
                            userId: currentUserId,
                          }
                        }
                      });

                      if (exists) {
                        continue; 
                      }

                      const messageId = msg.envelope?.messageId || `${msg.uid}@local-${dbFolderName.toLowerCase()}`;
                      const subject = msg.envelope?.subject || '(Sin Asunto)';
                      const from = extractAddress(msg.envelope?.from) || '';
                      const to = extractAddress(msg.envelope?.to) || '';
                      const cc = extractAddress(msg.envelope?.cc) || '';
                      const bcc = extractAddress(msg.envelope?.bcc) || '';
                      const receivedAt = msg.internalDate || msg.envelope?.date || new Date();

                      await prisma.email.create({
                        data: {
                          userId: currentUserId,
                          uid: msg.uid,
                          messageId,
                          subject,
                          from,
                          to,
                          cc,
                          bcc,
                          snippet: 'Abre el correo para ver el contenido...', // Placeholder
                          receivedAt,
                          folder: dbFolderName,
                        },
                      });
                      syncedCount++;
                    }
                  }
                } finally {
                  lock.release();
                }
                // If we succeeded, don't try the other folder names for this category
                break;
              } catch (folderErr: any) {
                console.warn(`Folder ${folderName} sync error:`, folderErr.message);
                debugInfo[`${folderName}_error`] = folderErr.message;
              }
            }
          };

          await syncFolder(['INBOX'], 'INBOX', 50);
          await syncFolder(['Sent', 'Sent Messages', 'INBOX.Sent', 'Enviados'], 'SENT', 30);
          await syncFolder(['Junk', 'Spam', 'INBOX.Junk', 'INBOX.Spam', 'Correo no deseado'], 'SPAM', 20);
          await syncFolder(['Trash', 'Deleted Messages', 'INBOX.Trash', 'Papelera'], 'TRASH', 20);

          await client.logout();
        };

        const timeoutPromise = new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('IMAP Sync Timeout')), 90000)
        );

        await Promise.race([syncPromise(), timeoutPromise]);
        console.log('[email sync] Completado rápido sincrónicamente.');
        return NextResponse.json({ success: true, message: 'Sync completado', background: false, syncedCount, debugInfo });
      } catch (err: any) {
        console.error('[email sync] Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }

  } catch (error: any) {
    console.error('Email sync general error:', error);
    return NextResponse.json({ success: false, error: error.message, authError: false }, { status: 500 });
  }
}

async function insertMockEmails(userId: string) {
  const mockEmails = [
    {
      uid: -1,
      messageId: "mock-msg-1@laserinova.com",
      subject: "Presupuesto urgente: 500 Etiquetas para Paquetes",
      from: "Juan Pérez <juan.perez@tiendavirtual.com>",
      to: "ricardob@laserinova.com",
      snippet: "Hola Ricardo, te escribo porque vi su plotter de impresión y corte en la página...",
      folder: "INBOX",
      receivedAt: new Date(Date.now() - 3600000 * 2),
    },
    {
      uid: -2,
      messageId: "mock-msg-2@laserinova.com",
      subject: "Termos Plumsa grabados en láser de fibra",
      from: "María Gómez <maria.g@corporativo.com>",
      to: "ricardob@laserinova.com",
      snippet: "Hola, vi que graban termos con láser. Quería saber si tienen stock de 150 termos...",
      folder: "INBOX",
      receivedAt: new Date(Date.now() - 3600000 * 5),
    },
    {
      uid: -3,
      messageId: "mock-msg-3@laserinova.com",
      subject: "Corte de Acrílico para Exhibidores",
      from: "Carlos Ruiz <carlos@disenointerno.com>",
      to: "ricardob@laserinova.com",
      snippet: "Buenas tardes, adjunto el plano en PDF para el corte láser de acrílico cristal...",
      folder: "INBOX",
      receivedAt: new Date(Date.now() - 3600000 * 24),
    }
  ];

  for (const emailData of mockEmails) {
    const exists = await prisma.email.findFirst({
      where: { userId, folder: emailData.folder, uid: emailData.uid }
    });

    if (!exists) {
      await prisma.email.create({
        data: {
          userId,
          uid: emailData.uid,
          messageId: emailData.messageId,
          subject: emailData.subject,
          from: emailData.from,
          to: emailData.to,
          snippet: emailData.snippet,
          folder: emailData.folder,
          receivedAt: emailData.receivedAt,
          isRead: false,
        }
      });
    }
  }
}
