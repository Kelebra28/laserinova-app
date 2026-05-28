import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadEmailFromDisk } from '@/lib/emailStorage';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const email = await prisma.email.findUnique({
      where: { id },
      select: { storagePath: true }
    });

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email not found' }, { status: 404 });
    }

    if (!email.storagePath) {
      return NextResponse.json({ success: false, error: 'No storage path for this email' }, { status: 404 });
    }

    const { html, text } = loadEmailFromDisk(email.storagePath);
    return NextResponse.json({ success: true, html, text });
  } catch (error: any) {
    console.error('Email body fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
