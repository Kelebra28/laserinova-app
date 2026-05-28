import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { decrypt } from '@/lib/encryption';

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

    let smtpUser = dbUser?.email || '';
    let smtpPass = '';
    let smtpHost = dbUser?.emailOutgoingServer || 'smtp.hostinger.com';
    let smtpPort = 465;

    if (dbUser?.emailPasswordEncrypted) {
      try {
        smtpPass = decrypt(dbUser.emailPasswordEncrypted);
      } catch (e) {
        console.error("Failed to decrypt user SMTP password, falling back to global", e);
      }
    }

    // Fallback to global env
    if (!smtpPass) {
      smtpUser = process.env.SMTP_USER || '';
      smtpPass = process.env.SMTP_PASS || '';
      smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
      smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    }

    const smtpFrom = smtpUser;

    const data = await req.formData();
    const to = data.get('to') as string;
    const subject = data.get('subject') as string;
    const text = data.get('text') as string;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const attachments = [];
    const files = data.getAll('attachments') as File[];
    
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      attachments.push({
        filename: file.name,
        content: buffer,
        contentType: file.type,
      });
    }

    // Send the email (or mock it)
    let messageId = uuidv4();
    const isMock = process.env.EMAIL_MOCK === 'true';

    if (!isMock) {
      try {
        const info = await transporter.sendMail({
          from: smtpFrom,
          to,
          subject,
          text,
          attachments,
        });
        messageId = info.messageId || messageId;
      } catch (smtpError: any) {
        console.warn("SMTP send failed, falling back to local simulation.", smtpError.message);
      }
    } else {
      console.log("Mock Mode: Simulating SMTP email sending to:", to);
    }
    
    const created = await prisma.email.create({
      data: {
        messageId,
        subject,
        from: smtpFrom,
        to,
        bodyText: text,
        snippet: text.substring(0, 100),
        receivedAt: new Date(),
        folder: 'SENT',
        isRead: true,
      }
    });

    if (attachments.length > 0) {
      await prisma.attachment.createMany({
        data: attachments.map(att => ({
          emailId: created.id,
          filename: att.filename,
          mimeType: att.contentType,
          size: att.content.length,
        })),
      });
    }

    return NextResponse.json({ success: true, messageId: created.messageId });
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
