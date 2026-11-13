export const dynamic = 'force-dynamic';
import { DEFAULT_SIGNATURE_PHONE } from '@/lib/email-signature';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import { saveEmailToDisk } from '@/lib/emailStorage';
import { buildEmailBodies } from '@/lib/email-compose';

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

    // Fallback to global env ONLY if the user is the main admin (email matches SMTP_USER)
    if (!smtpPass) {
      if (dbUser?.email && dbUser.email !== process.env.SMTP_USER) {
        return NextResponse.json(
          { success: false, error: 'No has configurado tu contraseña de correo. Por favor, ve a Configuración de Perfil y establécela para poder enviar correos.' },
          { status: 400 }
        );
      }
      smtpUser = process.env.SMTP_USER || '';
      smtpPass = process.env.SMTP_PASS || '';
      smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
      smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    }

    const data = await req.formData();
    const to = data.get('to') as string;
    const cc = data.get('cc') as string;
    const subject = data.get('subject') as string;
    const text = data.get('text') as string;
    const inReplyTo = (data.get('inReplyTo') as string) || '';
    // Si es una respuesta, el historial llega aparte (encabezado + texto del original) para poder darle formato de cita
    const quoteHeader = (data.get('quoteHeader') as string) || '';
    const quoteBody = (data.get('quoteBody') as string) || '';

    // Read customized signature inputs from frontend request BEFORE creating smtpFrom
    const sigName = data.get('sigName') as string || 'Ricardo Basurto';
    const sigTitle = data.get('sigTitle') as string || 'Director General';
    const sigPhone = data.get('sigPhone') as string || DEFAULT_SIGNATURE_PHONE;
    const sigEmail = data.get('sigEmail') as string || smtpUser;
    const sigWeb = data.get('sigWeb') as string || 'www.laserinova.com';

    const smtpFrom = `"${sigName}" <${smtpUser}>`;

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

    // Attach inline corporate logo signature image for SMTP email using fs buffer to guarantee delivery
    const isMock = process.env.EMAIL_MOCK === 'true';
    if (!isMock) {
      try {
        const logoPath = path.join(process.cwd(), 'public', 'logo_pdf.png');
        const logoBuffer = fs.readFileSync(logoPath);
        attachments.push({
          filename: 'logo_pdf.png',
          content: logoBuffer,
          contentType: 'image/png',
          cid: 'logo_pdf'
        } as any);
      } catch (err) {
        console.error("Failed to read logo_pdf.png for inline signature attachment:", err);
      }
    }

    const { html: htmlBody, plain: plainBody } = buildEmailBodies({
      text,
      quoteHeader,
      quoteBody,
      sig: { name: sigName, title: sigTitle, phone: sigPhone, email: sigEmail, web: sigWeb },
      logoSrc: 'cid:logo_pdf',
    });

    // Send the email (or mock it)
    let messageId = uuidv4();

    if (!isMock) {
      try {
        const info = await transporter.sendMail({
          from: smtpFrom,
          to,
          cc,
          subject,
          text: plainBody,
          html: htmlBody,
          // Para que el correo de destino lo agrupe en el mismo hilo que el original
          ...(inReplyTo ? { inReplyTo, references: [inReplyTo] } : {}),
          attachments,
        });
        messageId = info.messageId || messageId;
      } catch (smtpError: any) {
        console.error("SMTP send failed:", smtpError.message);
        throw new Error("SMTP: " + smtpError.message); // Force throw so frontend sees the error
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
        storagePath: saveEmailToDisk(messageId, htmlBody.replace('cid:logo_pdf', '/logo_pdf.png'), text),
        snippet: text.substring(0, 100),
        receivedAt: new Date(),
        folder: 'SENT',
        isRead: true,
        threadId: inReplyTo || null,
        userId: (session.user as any).id,
      }
    });

    const activeAttachments = attachments.filter(att => att.filename !== 'logo_pdf.png');
    if (activeAttachments.length > 0) {
      await prisma.attachment.createMany({
        data: activeAttachments.map(att => ({
          emailId: created.id,
          filename: att.filename,
          mimeType: att.contentType,
          size: att.content ? att.content.length : 0,
        })),
      });
    }

    return NextResponse.json({ success: true, messageId: created.messageId });
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
