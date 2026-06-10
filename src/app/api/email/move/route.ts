import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailId, folder } = await req.json();

    if (!emailId || !folder) {
      return NextResponse.json({ error: 'Missing emailId or folder' }, { status: 400 });
    }

    // Validar carpeta
    const validFolders = ['INBOX', 'SENT', 'SPAM', 'TRASH'];
    if (!validFolders.includes(folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }

    const updatedEmail = await prisma.email.update({
      where: { id: emailId },
      data: { folder },
    });

    return NextResponse.json({ success: true, email: updatedEmail });
  } catch (error: any) {
    console.error('Error moving email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
