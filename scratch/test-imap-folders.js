const { PrismaClient } = require('@prisma/client');
const { ImapFlow } = require('imapflow');
const crypto = require('crypto');
const prisma = new PrismaClient();

const ALGORITHM = 'aes-256-gcm';
function getKey() {
  const secret = process.env.NEXTAUTH_SECRET || "I+=lhvDujb~2";
  return crypto.createHash('sha256').update(secret).digest();
}

function decrypt(encryptedText) {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return null;
  }
}

async function main() {
  require('dotenv').config();

  const dbUser = await prisma.user.findFirst({
    where: { email: 'ricardob@laserinova.com' }
  });

  if (!dbUser) {
    console.error("No se encontró al usuario Ricardo Basurto en la DB.");
    return;
  }

  const imapUser = dbUser.email;
  const imapPass = decrypt(dbUser.emailPasswordEncrypted);
  const imapHost = dbUser.emailIncomingServer || 'imap.hostinger.com';

  if (!imapPass) {
    console.error("No se pudo desencriptar la contraseña de Ricardo.");
    return;
  }

  console.log(`Conectando a Hostinger IMAP...`);
  console.log(`Host: ${imapHost} | Usuario: ${imapUser}`);

  const client = new ImapFlow({
    host: imapHost,
    port: 993,
    secure: true,
    auth: { user: imapUser, pass: imapPass },
    logger: false,
    connectionTimeout: 10000,
  });

  try {
    await client.connect();
    console.log("¡CONEXIÓN EXITOSA!");
    
    console.log("Listando carpetas...");
    const folders = await client.list();
    for (const f of folders) {
      console.log(`- "${f.path}"`);
    }
    await client.logout();
  } catch (err) {
    console.error("Error conectando a IMAP:", err.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
