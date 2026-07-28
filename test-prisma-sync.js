const { PrismaClient } = require('@prisma/client');
const { ImapFlow } = require('imapflow');
const prisma = new PrismaClient();

async function main() {
  const imapUser = 'ricardob@laserinova.com';
  const imapPass = 'Ricardomma28$$$';
  const imapHost = 'imap.hostinger.com';
  const currentUserId = '027463e5-015f-4383-a547-0cdd553674b6';
  
  const client = new ImapFlow({
    host: imapHost,
    port: 993,
    secure: true,
    auth: { user: imapUser, pass: imapPass },
    logger: false,
    connectionTimeout: 8000,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    const dbFolderName = 'INBOX';
    const messages = client.fetch('238:*', { uid: true, envelope: true, internalDate: true });
    
    for await (const msg of messages) {
      if (!msg.uid) continue;
      
      const exists = await prisma.email.findFirst({ 
        where: { userId: currentUserId, folder: dbFolderName, uid: msg.uid } 
      });
      if (exists) { console.log('Exists:', msg.uid); continue; }

      const messageId = msg.envelope?.messageId || `${msg.uid}@local-inbox`;
      
      function extractAddress(addrArray) {
        if (!addrArray || !addrArray.length) return '';
        return addrArray.map(a => `${a.name ? `"${a.name}" ` : ''}<${a.address}>`).join(', ');
      }

      console.log('Inserting', msg.uid);
      try {
        await prisma.email.create({
          data: {
            userId: currentUserId,
            uid: msg.uid,
            messageId,
            subject: msg.envelope?.subject || '(Sin Asunto)',
            from: extractAddress(msg.envelope?.from) || '',
            to: extractAddress(msg.envelope?.to) || '',
            cc: extractAddress(msg.envelope?.cc) || '',
            bcc: extractAddress(msg.envelope?.bcc) || '',
            snippet: 'Abre el correo para ver el contenido...',
            receivedAt: msg.internalDate || msg.envelope?.date || new Date(),
            folder: dbFolderName,
          },
        });
        console.log('Inserted successfully!');
      } catch (e) {
        console.log('PRISMA ERROR:', e.message);
      }
    }
    lock.release();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.logout();
    await prisma.$disconnect();
  }
}
main();
