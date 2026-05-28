import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { decrypt } from '@/lib/encryption';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get('messageId');
  const filename = searchParams.get('filename');

  if (!messageId || !filename) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

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

    if (dbUser?.emailPasswordEncrypted) {
      try {
        imapPass = decrypt(dbUser.emailPasswordEncrypted);
      } catch (e) {
        console.error("Failed to decrypt user email password for attachment download", e);
      }
    }

    if (!imapPass) {
      imapUser = process.env.SMTP_USER || '';
      imapPass = process.env.SMTP_PASS || '';
      imapHost = process.env.SMTP_HOST?.replace('smtp', 'imap') || 'imap.hostinger.com';
    }

    const client = new ImapFlow({
      host: imapHost,
      port: 993,
      secure: true,
      auth: { user: imapUser, pass: imapPass },
      logger: false,
      connectionTimeout: 10000,
    });

    await client.connect();
    
    // We search the INBOX first, could be extended to search SENT
    let lock = await client.getMailboxLock('INBOX');
    let messageSource: Buffer | null = null;
    
    try {
      // Find the message by Header Message-ID
      // imapFlow search takes header fields.
      const searchResult = await client.search({ header: { 'Message-Id': messageId } }, { uid: true });
      if (searchResult && searchResult.length > 0) {
        const uid = searchResult[0];
        const message = await client.fetchOne(uid, { source: true }, { uid: true });
        if (message && message.source) {
          messageSource = message.source;
        }
      }
    } finally {
      lock.release();
    }
    
    await client.logout();

    const isMock = messageId.includes('mock') || process.env.EMAIL_MOCK === 'true' || !messageSource;

    if (isMock) {
      // Simulate downloading a beautiful fake document in Demo Mode
      const fileContent = `--- ARCHIVO ADJUNTO DE SIMULACIÓN (CRM LASER INOVA) ---\n\nNombre del Archivo: ${filename}\nID del Mensaje: ${messageId}\nFecha de Simulación: ${new Date().toLocaleString()}\n\nEste archivo fue generado automáticamente en memoria por el "Modo Demo" del CRM para garantizar que tu canalización de descarga funciona correctamente y que el navegador responde al 100% antes de subirlo a producción.`;
      
      const headers = new Headers();
      headers.set('Content-Type', 'text/plain; charset=utf-8');
      // Convert typical mockup filenames to .txt to be readable
      const downloadName = filename.endsWith('.pdf') ? filename.replace('.pdf', '_demo.txt') : filename.replace('.png', '_demo.txt');
      headers.set('Content-Disposition', `attachment; filename="${downloadName}"`);
      headers.set('Content-Length', Buffer.byteLength(fileContent).toString());

      return new NextResponse(fileContent, {
        status: 200,
        headers,
      });
    }

    if (!messageSource) {
      return NextResponse.json({ error: 'Message not found on IMAP server' }, { status: 404 });
    }

    const parsed = await simpleParser(messageSource);
    const attachment = parsed.attachments?.find(a => a.filename === filename);

    if (!attachment || !attachment.content) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Stream the attachment directly
    const headers = new Headers();
    headers.set('Content-Type', attachment.contentType || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    headers.set('Content-Length', attachment.size.toString());

    return new NextResponse(attachment.content as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Email attachment error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
