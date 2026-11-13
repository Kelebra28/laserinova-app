export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getImapConfig } from '@/lib/email-imap';
import { runMailboxSync } from '@/lib/email-sync';
import { notificationEmitter } from '@/lib/notification-emitter';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUserId = (session.user as any).id;

    if (process.env.EMAIL_MOCK === 'true') {
      await insertMockEmails(currentUserId);
      return NextResponse.json({ success: true, message: 'Sync completed (Demo Mode)', mock: true });
    }

    if (!(await getImapConfig(currentUserId))) {
      return NextResponse.json({
        success: false,
        message: 'No se encontraron credenciales de correo configuradas.',
        authError: true,
      }, { status: 401 });
    }

    // Botón "Sincronizar" y primera carga: pasada completa. La revisión automática manda ?full=0 (solo lo nuevo).
    const full = new URL(req.url).searchParams.get('full') !== '0';

    try {
      const result = await runMailboxSync(currentUserId, { full });
      if (!result) {
        return NextResponse.json({ success: true, message: 'Ya hay una sincronización en curso', background: false, syncedCount: 0, skipped: true });
      }
      if (result.newInbox.length) {
        const dbUser = await prisma.user.findUnique({ where: { id: currentUserId }, select: { email: true } });
        await notificationEmitter.emit('email_new', { email: dbUser?.email, count: result.newInbox.length, latest: result.newInbox[0] });
      }
      return NextResponse.json({ success: true, message: 'Sync completado', background: false, syncedCount: result.syncedCount });
    } catch (err: any) {
      console.error('[email sync] Error:', err.message);
      const authError = /auth|login|credential|invalid/i.test(err.message || '');
      return NextResponse.json({ success: false, error: err.message, authError }, { status: authError ? 401 : 500 });
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
