import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import { saveEmailToDisk } from '@/lib/emailStorage';

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
    let usedFallback = false;
    if (!imapPass) {
      usedFallback = true;
      imapUser = process.env.SMTP_USER || '';
      imapPass = process.env.SMTP_PASS || '';
      imapHost = process.env.SMTP_HOST?.replace('smtp', 'imap') || 'imap.hostinger.com';
    }

    // Check if mock is explicitly enabled or if connection fails
    const isMockForced = process.env.EMAIL_MOCK === 'true';
    
    if (isMockForced) {
      await insertMockEmails();
      return NextResponse.json({ success: true, message: 'Sync completed (Demo Mode)', mock: true });
    }

    try {
      // Global timeout de 12 segundos para dar margen suficiente a la red
      const syncPromise = async () => {
        const client = new ImapFlow({
          host: imapHost,
          port: 993,
          secure: true,
          auth: { user: imapUser, pass: imapPass },
          logger: false,
          connectionTimeout: 6000,
        });

        await client.connect();

        // Restablecer todos los correos marcados como SPAM de vuelta a INBOX antes de sincronizar (para este usuario)
        try {
          await prisma.email.updateMany({
            where: { folder: 'SPAM', userId: currentUserId },
            data: { folder: 'INBOX' }
          });
        } catch (resetErr: any) {
          console.warn("Error restableciendo bandeja de spam:", resetErr.message);
        }

        const syncFolder = async (folderName: string, dbFolderName: string, maxCount: number) => {
          try {
            const lock = await client.getMailboxLock(folderName);
            try {
              const totalMessages = client.mailbox ? (client.mailbox as any).exists : 0;
              if (totalMessages > 0) {
                const startRange = Math.max(1, totalMessages - (maxCount - 1));
                // Fetch UID and Envelope first - ultra fast, doesn't download body/attachments
                const messages = client.fetch(`${startRange}:*`, { uid: true, envelope: true });
                const msgList = [];
                for await (const msg of messages) {
                  msgList.push(msg);
                }

                // Process messages
                for (const msg of msgList) {
                  const messageId = msg.envelope?.messageId || `${msg.uid}@local-${dbFolderName.toLowerCase()}`;
                  
                  // Check if it already exists in DB
                  const exists = await prisma.email.findUnique({ where: { messageId } });
                  if (exists) {
                    // Si ya existe pero su carpeta en DB es distinta, la actualizamos para que coincida con el servidor
                    if (exists.folder !== dbFolderName) {
                      await prisma.email.update({
                        where: { messageId },
                        data: { folder: dbFolderName }
                      });
                    }
                    continue;
                  }

                  // Only fetch full raw RFC822 source for new emails
                  const fetchResult = await client.fetchOne(msg.uid, { source: true });
                  if (fetchResult && fetchResult.source) {
                    const parsed = await simpleParser(fetchResult.source);
                    
                    const created = await prisma.email.create({
                      data: {
                        userId: currentUserId,
                        messageId,
                        subject: parsed.subject || '(Sin Asunto)',
                        from: (parsed.from as any)?.text || '',
                        to: (parsed.to as any)?.text || '',
                        cc: (parsed.cc as any)?.text || '',
                        bcc: (parsed.bcc as any)?.text || '',
                        storagePath: saveEmailToDisk(messageId, parsed.html || '', parsed.text || ''),
                        snippet: parsed.text?.substring(0, 100) || '',
                        receivedAt: parsed.date || new Date(),
                        folder: dbFolderName,
                      },
                    });

                    if (parsed.attachments && parsed.attachments.length > 0) {
                      await prisma.attachment.createMany({
                        data: parsed.attachments.map(att => ({
                          emailId: created.id,
                          filename: att.filename || 'adjunto',
                          mimeType: att.contentType || 'application/octet-stream',
                          size: att.size || 0,
                          contentId: att.contentId,
                        })),
                      });
                    }
                  }
                }
              }
            } finally {
              lock.release();
            }
          } catch (folderErr: any) {
            console.warn(`Folder ${folderName} sync error:`, folderErr.message);
          }
        };

        // Sincronizar bandejas principales natively
        await syncFolder('INBOX', 'INBOX', 20);
        await syncFolder('INBOX.Sent', 'SENT', 15);
        await syncFolder('INBOX.Junk', 'SPAM', 15);

        await client.logout();
      };

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Global IMAP Sync Timeout')), 25000)
      );

      await Promise.race([syncPromise(), timeoutPromise]);
      
      return NextResponse.json({ success: true, message: 'Sync completed' });

    } catch (connectionError: any) {
      console.warn("IMAP Connection failed.", connectionError.message);
      const errMsg = (connectionError.message || '').toUpperCase();
      const isAuthError = decryptionFailed || 
                          !imapPass || 
                          errMsg.includes('AUTHENTICATIONFAILED') || 
                          errMsg.includes('LOGIN FAILED') || 
                          errMsg.includes('CREDENTIAL') || 
                          errMsg.includes('AUTH');
      
      return NextResponse.json({ 
        success: false, 
        message: 'Sync failed to connect to IMAP server', 
        errorDetail: connectionError.message,
        decryptionFailed,
        decryptionError,
        usedFallback,
        imapUserUsed: imapUser,
        mock: false,
        authError: isAuthError
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Email sync general error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      authError: false
    }, { status: 500 });
  }
}

async function insertMockEmails() {
  const count = await prisma.email.count();
  // Eliminamos el return temprano para asegurarnos de que se inserten o actualicen
  // las nuevas bandejas (Enviados, Spam, Papelera) que acabamos de agregar al Mock.

  const mockEmails = [
    {
      messageId: "mock-msg-1@laserinova.com",
      subject: "Presupuesto urgente: 500 Etiquetas para Paquetes",
      from: "Juan Pérez <juan.perez@tiendavirtual.com>",
      to: "ricardob@laserinova.com",
      snippet: "Hola Ricardo, te escribo porque vi su plotter de impresión y corte en la página...",
      bodyText: "Hola Ricardo,\n\nTe escribo porque vi su plotter de impresión y corte en la página web y me pareció excelente la calidad. Necesitamos cotizar urgentemente 500 etiquetas redondas autoadhesivas de 6cm de diámetro para los paquetes de nuestra tienda virtual.\n\nTe adjunto el logotipo de nuestra marca para ver si es viable.\n\nQuedo a la espera,\nJuan Pérez.",
      folder: "INBOX",
      receivedAt: new Date(Date.now() - 3600000 * 2), // hace 2 horas
    },
    {
      messageId: "mock-msg-2@laserinova.com",
      subject: "Termos Plumsa grabados en láser de fibra",
      from: "María Gómez <maria.g@corporativo.com>",
      to: "ricardob@laserinova.com",
      snippet: "Hola, vi que graban termos con láser. Quería saber si tienen stock de 150 termos...",
      bodyText: "Hola,\n\nVi que graban termos con láser de fibra y que tienen termos de reventa Plumsa. Quería saber si tienen stock de 150 termos en color negro mate y cuánto tiempo tardaría el grabado de nuestro logotipo corporativo en ellos.\n\n¿Nos podrían enviar una cotización formal?\n\nSaludos,\nMaría Gómez.",
      folder: "INBOX",
      receivedAt: new Date(Date.now() - 3600000 * 5), // hace 5 horas
    },
    {
      messageId: "mock-msg-3@laserinova.com",
      subject: "Corte de Acrílico para Exhibidores",
      from: "Carlos Ruiz <carlos@disenointerno.com>",
      to: "ricardob@laserinova.com",
      snippet: "Buenas tardes, adjunto el plano en PDF para el corte láser de acrílico cristal...",
      bodyText: "Buenas tardes Ricardo,\n\nAdjunto el plano en formato PDF vectorizado para el corte láser de acrílico cristal de 3mm. Son piezas para unos exhibidores de mesa. Serían 50 juegos.\n\nPor favor, confírmame el costo de producción y si el material lo ponen ustedes o lo llevamos nosotros.\n\nAtentamente,\nCarlos Ruiz.",
      folder: "INBOX",
      receivedAt: new Date(Date.now() - 3600000 * 24), // hace 24 horas
    },
    {
      messageId: "mock-msg-4@laserinova.com",
      subject: "Re: Termos Plumsa grabados en láser de fibra",
      from: "Ricardo B <ricardob@laserinova.com>",
      to: "maria.g@corporativo.com",
      snippet: "Hola María, claro que sí. Te adjunto la cotización para los 150 termos Plumsa grabados...",
      bodyText: "Hola María,\n\nClaro que sí. Te adjunto la cotización para los 150 termos Plumsa en color negro mate grabados con tu logotipo.\n\nEl tiempo de entrega es de 4 días hábiles una vez aprobado el diseño.\n\nSaludos,\nRicardo B.",
      folder: "SENT",
      receivedAt: new Date(Date.now() - 3600000 * 4), // hace 4 horas
    },
    {
      messageId: "mock-msg-5@laserinova.com",
      subject: "Re: Corte de Acrílico para Exhibidores",
      from: "Ricardo B <ricardob@laserinova.com>",
      to: "carlos@disenointerno.com",
      snippet: "Carlos, he revisado el plano. Te envío nuestra propuesta comercial...",
      bodyText: "Carlos,\n\nHe revisado el plano. Te envío nuestra propuesta comercial con los costos de producción y material incluido.\n\nQuedo al pendiente.\nRicardo.",
      folder: "SENT",
      receivedAt: new Date(Date.now() - 3600000 * 23), // hace 23 horas
    },
    {
      messageId: "mock-msg-6@laserinova.com",
      subject: "Gana miles de dolares desde casa ahora mismo!",
      from: "Spam Bot <noreply@spam.com>",
      to: "ricardob@laserinova.com",
      snippet: "Abre este correo para descubrir como ganar mucho dinero sin esfuerzo...",
      bodyText: "Hola, \n\nTenemos una oferta increíble para ti. Puedes ganar dinero fácil desde tu casa...\n\n(No abras el enlace falso)",
      folder: "SPAM",
      receivedAt: new Date(Date.now() - 3600000 * 48), // hace 2 dias
    },
    {
      messageId: "mock-msg-7@laserinova.com",
      subject: "Correo de prueba eliminado",
      from: "Sistema de pruebas <test@local.dev>",
      to: "ricardob@laserinova.com",
      snippet: "Este es un correo que fue eliminado recientemente.",
      bodyText: "Hola, esto es solo una prueba de cómo se vería un correo en la papelera.",
      folder: "TRASH",
      receivedAt: new Date(Date.now() - 3600000 * 72), // hace 3 dias
    }
  ];

  for (const emailData of mockEmails) {
    const created = await prisma.email.upsert({
      where: { messageId: emailData.messageId },
      update: {},
      create: {
        messageId: emailData.messageId,
        subject: emailData.subject,
        from: emailData.from,
        to: emailData.to,
        snippet: emailData.snippet,
        storagePath: saveEmailToDisk(emailData.messageId, `<p>${emailData.bodyText.replace(/\n/g, '<br>')}</p>`, emailData.bodyText),
        folder: emailData.folder,
        receivedAt: emailData.receivedAt,
        isRead: false,
      }
    });

    // Solo agregar adjuntos si no existen (evitar duplicados en mock)
    const attachCount = await prisma.attachment.count({ where: { emailId: created.id } });
    if (attachCount === 0) {
      if (emailData.subject.includes("Acrílico")) {
        await prisma.attachment.create({
          data: {
            emailId: created.id,
            filename: "plano_exhibidor_acrilico.pdf",
            mimeType: "application/pdf",
            size: 154200,
          }
        });
      }
      if (emailData.subject.includes("Etiquetas")) {
        await prisma.attachment.create({
          data: {
            emailId: created.id,
            filename: "logo_marca_etiqueta.png",
            mimeType: "image/png",
            size: 89400,
          }
        });
      }
    }
  }
}
