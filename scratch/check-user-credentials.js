const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

// Exact decryption logic from CRM
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
  // Load .env explicitly if needed
  require('dotenv').config();
  
  const users = await prisma.user.findMany();
  console.log(`Se encontraron ${users.length} usuarios en la base de datos.`);
  
  for (const u of users) {
    console.log(`\nUsuario: "${u.name}" | Email: "${u.email}"`);
    console.log(`- Incoming Server: "${u.emailIncomingServer}"`);
    if (u.emailPasswordEncrypted) {
      console.log(`- Contraseña encriptada: "${u.emailPasswordEncrypted.substring(0, 30)}..."`);
      const decrypted = decrypt(u.emailPasswordEncrypted);
      if (decrypted) {
        console.log(`- Contraseña desencriptada con ÉXITO!`);
      } else {
        console.log(`- Contraseña: FALLÓ al desencriptar.`);
      }
    } else {
      console.log(`- Contraseña encriptada: NO TIENE CONFIGURADA`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
