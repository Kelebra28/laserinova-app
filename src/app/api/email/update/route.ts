import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailId, folder, isRead } = await req.json();

    if (!emailId) {
      return NextResponse.json({ error: 'Missing emailId' }, { status: 400 });
    }

    const updateData: any = {};
    if (folder !== undefined) {
      const validFolders = ['INBOX', 'SENT', 'SPAM', 'TRASH'];
      if (!validFolders.includes(folder)) {
        return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
      }
      updateData.folder = folder;
    }
    if (isRead !== undefined) {
      updateData.isRead = isRead;
    }

    const updatedEmail = await prisma.email.update({
      where: { id: emailId },
      data: updateData,
    });

    return NextResponse.json({ success: true, email: updatedEmail });
  } catch (error: any) {
    console.error('Error updating email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
