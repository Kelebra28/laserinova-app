require('dotenv').config();
const { ImapFlow } = require('imapflow');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function decrypt(encryptedText) {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development';
  const key = crypto.createHash('sha256').update(String(secret)).digest('base64').substring(0, 32);
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encrypted = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function main() {
  const users = await prisma.user.findMany();
  const dbUser = users.find(u => u.email && u.emailPasswordEncrypted);
  if (!dbUser) return console.log('No user');
  
  const imapUser = dbUser.email;
  const imapPass = decrypt(dbUser.emailPasswordEncrypted);
  
  const client = new ImapFlow({
    host: dbUser.emailIncomingServer || 'imap.hostinger.com',
    port: 993,
    secure: true,
    auth: { user: imapUser, pass: imapPass },
    logger: false,
  });

  await client.connect();
  const tree = await client.listTree();
  console.log(JSON.stringify(tree, null, 2));
  await client.logout();
}

main().catch(console.error).finally(() => prisma.$disconnect());
