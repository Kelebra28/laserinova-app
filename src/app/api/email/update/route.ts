export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { imapMove, imapSetFlag } from '@/lib/email-imap';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailId, folder, isRead, isStarred } = await req.json();

    if (!emailId) {
      return NextResponse.json({ error: 'Missing emailId' }, { status: 400 });
    }

    const currentUserId = (session.user as any).id;
    const current = await prisma.email.findFirst({ where: { id: emailId, userId: currentUserId } });
    if (!current) {
      return NextResponse.json({ error: 'Correo no encontrado' }, { status: 404 });
    }
    const isReal = !!current.uid && current.uid > 0 && process.env.EMAIL_MOCK !== 'true';

    const updateData: any = {};
    if (folder !== undefined) {
      const validFolders = ['INBOX', 'SENT', 'SPAM', 'TRASH', 'STARRED'];
      if (!validFolders.includes(folder)) {
        return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
      }
      updateData.folder = folder;
    }
    if (isRead !== undefined) {
      updateData.isRead = isRead;
    }
    if (isStarred !== undefined) {
      updateData.isStarred = isStarred;
    }

    // Mover de carpeta se hace PRIMERO en el servidor: si falla no se cambia nada aquí, para que el CRM
    // y el buzón no se desfasen (antes el correo "movido" reaparecía en Recibidos al sincronizar).
    if (isReal && folder !== undefined && folder !== 'STARRED' && folder !== current.folder) {
      try {
        const newUid = await imapMove(currentUserId, { folder: current.folder, uid: current.uid, messageId: current.messageId }, folder);
        updateData.uid = newUid ?? null;
      } catch (e: any) {
        console.error('IMAP move failed:', e?.message);
        return NextResponse.json({ success: false, error: 'No se pudo mover el correo en el servidor: ' + (e?.message || 'error de conexión') }, { status: 502 });
      }
    }

    // Leído y destacado: el CRM manda; en el servidor se refleja sin bloquear si falla.
    if (isReal && folder === undefined || (isReal && folder === current.folder)) {
      const ref = { folder: current.folder, uid: current.uid, messageId: current.messageId };
      if (isRead !== undefined && isRead !== current.isRead) await imapSetFlag(currentUserId, ref, '\\Seen', isRead).catch((e) => console.warn('IMAP seen:', e?.message));
      if (isStarred !== undefined && isStarred !== current.isStarred) await imapSetFlag(currentUserId, ref, '\\Flagged', isStarred).catch((e) => console.warn('IMAP flagged:', e?.message));
    }

    let updatedEmail;
    try {
      updatedEmail = await prisma.email.update({ where: { id: emailId }, data: updateData });
    } catch (e: any) {
      // Ya existía en el destino un registro con el mismo UID (lo trajo una sincronización): se quita el viejo.
      if (e?.code === 'P2002') {
        await prisma.email.delete({ where: { id: emailId } });
        return NextResponse.json({ success: true, email: null });
      }
      throw e;
    }

    return NextResponse.json({ success: true, email: updatedEmail });
  } catch (error: any) {
    console.error('Error updating email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
