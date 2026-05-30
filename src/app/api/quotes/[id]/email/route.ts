import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateQuotePDF } from "@/lib/pdf";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import nodemailer from "nodemailer";
import { decrypt } from "@/lib/encryption";
import path from "path";
import fs from "fs";
import { saveEmailToDisk } from '@/lib/emailStorage';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const quoteId = params.id;
  const { toEmail, ccEmail, message, saveToClient, sigName, sigTitle, sigPhone, sigWeb, sigEmail } = await request.json();

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      client: true,
      concepts: { orderBy: { order: 'asc' } },
      user: true,
    }
  });

  if (!quote) {
    return new NextResponse("Quote not found", { status: 404 });
  }

  try {
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

    // Save manual email to client profile if checked
    if (saveToClient && quote.clientId && toEmail) {
      // Usar solo el primer email si hay varios para guardar en el cliente
      const primaryEmail = toEmail.split(',')[0].trim();
      await prisma.client.update({
        where: { id: quote.clientId },
        data: { email: primaryEmail }
      });
    }

    const senderDisplayName = `Laser Inova - ${dbUser?.name || 'Ricardo Basurto'}`;
    const smtpFrom = `"${senderDisplayName}" <${smtpUser}>`;

    // Generate PDF buffer
    const pdfBuffer = await generateQuotePDF(quote);
    
    // Configure transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const defaultMessage = `Hola ${quote.client?.name || "Cliente"},\n\nAdjunto encontrarás la cotización para el proyecto "${quote.project}".\n\nSaludos,\nEl equipo de Laser Inova`;

    const subject = `Cotización ${quote.folio} - Laser Inova`;

    const attachments: any[] = [
      {
        filename: `Cotizacion_${quote.folio}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
    ];

    // Signature logic
    const signatureName = sigName || dbUser?.name || 'Ricardo Basurto';
    const signatureTitle = sigTitle || 'Director General';
    const signaturePhone = sigPhone || '+52 1 55 1234 5678';
    const signatureWeb = sigWeb || 'www.laserinova.com';
    const signatureEmail = sigEmail || smtpUser;
    const cleanPhone = signaturePhone.replace(/\D/g, '');

    // Attach signature image inline
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
        });
      } catch (err) {
        console.error("Failed to read logo_pdf.png for inline signature attachment:", err);
      }
    }

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
            <div style="font-weight: bold; font-size: 15px; color: #0f172a;">${signatureName}</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 2px;">${signatureTitle}</div>
          </td>
          <td style="vertical-align: middle; padding-left: 15px;">
            <div style="margin-bottom: 4px;">
              <span style="font-weight: bold; color: #ef4444; font-size: 11px; text-transform: uppercase;">WhatsApp:</span> 
              <a href="https://wa.me/${cleanPhone}" style="color: #1e293b; text-decoration: none; font-weight: 500;">${signaturePhone}</a>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="font-weight: bold; color: #ef4444; font-size: 11px; text-transform: uppercase;">Email:</span> 
              <a href="mailto:${signatureEmail}" style="color: #1e293b; text-decoration: none; font-weight: 500;">${signatureEmail}</a>
            </div>
            <div>
              <span style="font-weight: bold; color: #ef4444; font-size: 11px; text-transform: uppercase;">Web:</span> 
              <a href="https://${signatureWeb.replace(/https?:\/\//, '')}" style="color: #1e293b; text-decoration: none; font-weight: 500;">${signatureWeb}</a>
            </div>
          </td>
        </tr>
      </table>
    `;

    const bodyText = message || defaultMessage;
    const bodyHtml = `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6;">${bodyText.replace(/\n/g, '<br>')}</div>` + signatureHtml;

    // Send email
    let info = { messageId: 'mock-quote-mail' } as any;
    if (!isMock) {
      info = await transporter.sendMail({
        from: smtpFrom,
        to: toEmail || quote.client?.email || "",
        cc: ccEmail || "",
        subject,
        text: bodyText,
        html: bodyHtml,
        attachments,
      });
    }

    // Log the email in DB
    await prisma.emailLog.create({
      data: {
        quoteId: quote.id,
        sentById: (session.user as any).id,
        sentTo: toEmail || quote.client?.email || "Unknown",
        subject,
        body: bodyText,
        status: "SENT",
        smtpResponse: isMock ? 'MOCK_SENT' : info.response,
      }
    });

    // Save email in centralized CRM Mail inbox
    await prisma.email.create({
      data: {
        messageId: isMock ? `mock-quote-${quote.id}` : info.messageId,
        subject,
        from: smtpFrom,
        to: toEmail || quote.client?.email || "",
        storagePath: saveEmailToDisk(isMock ? `mock-quote-${quote.id}` : info.messageId, bodyHtml.replace('cid:logo_pdf', '/logo_pdf.png'), bodyText),
        snippet: bodyText.substring(0, 100),
        receivedAt: new Date(),
        folder: 'SENT',
        isRead: true,
      }
    });

    // Update quote status to SENT
    await prisma.quote.update({
      where: { id: quote.id },
      data: { 
        status: "SENT",
        sentDate: new Date(),
      }
    });

    return NextResponse.json({ success: true, messageId: isMock ? 'mock-id' : info.messageId });
  } catch (error: any) {
    console.error("Error sending email:", error);
    
    // Log failure
    try {
      await prisma.emailLog.create({
        data: {
          quoteId,
          sentById: (session.user as any).id,
          sentTo: toEmail || quote?.client?.email || "Unknown",
          subject: `Cotización ${quote?.folio} - Laser Inova`,
          body: message || "Error al enviar",
          status: "FAILED",
          smtpResponse: error.message || "Unknown error",
        }
      });
    } catch (e) {
      console.error("Failed to write failure log:", e);
    }

    return new NextResponse("Error sending email: " + error.message, { status: 500 });
  }
}
