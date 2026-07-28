require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { ImapFlow } = require('imapflow');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const ricardo = users.find(u => u.email.includes('ricardob'));
  
  if (!ricardo) {
    console.log("No user found");
    return;
  }
  
  console.log("Testing sync for", ricardo.email);
  // Just use mock logic to see if mock insertion works
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
    }
  ];

  for (const emailData of mockEmails) {
    try {
      await prisma.email.create({
        data: {
          userId: ricardo.id,
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
      console.log("Inserted mock");
    } catch(e) {
      console.log("Error inserting mock:", e.message);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
