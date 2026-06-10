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

    // Read customized signature inputs from frontend request BEFORE creating smtpFrom
    const sigName = data.get('sigName') as string || 'Ricardo Basurto';
    const sigTitle = data.get('sigTitle') as string || 'Director General';
    const sigPhone = data.get('sigPhone') as string || '+52 1 55 1234 5678';
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

    const cleanPhone = sigPhone.replace(/\D/g, ''); // Extract only digits for whatsapp deep-link

    const signatureHtml = `
      <br><br>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <table style="font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.5; border-collapse: collapse;">
        <tr>
          <td colspan="2" style="padding-bottom: 12px;">
            <img src="cid:logo_pdf" alt="Laser Inova" style="height: 42px; display: block;">
          </td>
        </tr>
        <tr>
          <td style="vertical-align: middle; padding-right: 15px; border-right: 2px solid #ef4444;">
            <div style="font-weight: bold; font-size: 15px; color: #0f172a;">${sigName}</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 2px;">${sigTitle}</div>
          </td>
          <td style="vertical-align: middle; padding-left: 15px;">
            <div style="margin-bottom: 4px;">
              <span style="font-weight: bold; color: #ef4444; font-size: 11px; text-transform: uppercase;">WhatsApp:</span> 
              <a href="https://wa.me/${cleanPhone}" style="color: #1e293b; text-decoration: none; font-weight: 500;">${sigPhone}</a>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="font-weight: bold; color: #ef4444; font-size: 11px; text-transform: uppercase;">Email:</span> 
              <a href="mailto:${sigEmail}" style="color: #1e293b; text-decoration: none; font-weight: 500;">${sigEmail}</a>
            </div>
            <div>
              <span style="font-weight: bold; color: #ef4444; font-size: 11px; text-transform: uppercase;">Web:</span> 
              <a href="https://${sigWeb.replace(/https?:\/\//, '')}" style="color: #1e293b; text-decoration: none; font-weight: 500;">${sigWeb}</a>
            </div>
          </td>
        </tr>
      </table>
    `;

    const htmlBody = `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6;">${text.replace(/\n/g, '<br>')}</div>` + signatureHtml;

    // Send the email (or mock it)
    let messageId = uuidv4();

    if (!isMock) {
      try {
        const info = await transporter.sendMail({
          from: smtpFrom,
          to,
          cc,
          subject,
          text,
          html: htmlBody,
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
