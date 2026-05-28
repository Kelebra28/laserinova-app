require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

// Función para obtener la llave VIEJA (fallback)
function getOldKey() {
  const secret = 'fallback-secret-for-development';
  return crypto.createHash('sha256').update(secret).digest();
}

// Función para obtener la llave NUEVA (del archivo .env)
function getNewKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('No se encontró NEXTAUTH_SECRET en el archivo .env');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

// Desencriptar con la llave vieja
function decryptOld(encryptedText) {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted text format');
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const key = getOldKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Encriptar con la llave nueva
function encryptNew(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getNewKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

const prisma = new PrismaClient();

async function run() {
  console.log("=== CORRIGIENDO ENCRIPTACIÓN DE CONTRASEÑAS ===");
  try {
    const users = await prisma.user.findMany({
      where: { emailPasswordEncrypted: { not: null } }
    });

    for (const user of users) {
      if (!user.emailPasswordEncrypted) continue;
      
      console.log(`\nRevisando usuario: ${user.email}`);
      
      // Intentar primero desencriptar con la llave nueva para ver si ya está bien
      try {
        const parts = user.emailPasswordEncrypted.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        const decipher = crypto.createDecipheriv(ALGORITHM, getNewKey(), iv);
        decipher.setAuthTag(authTag);
        let dec = decipher.update(encrypted, 'hex', 'utf8');
        dec += decipher.final('utf8');
        console.log(`✅ La contraseña de ${user.email} YA ESTÁ encriptada con la llave correcta de .env. Saltando...`);
        continue;
      } catch (e) {
        // Falla la llave nueva, vamos a intentar con la vieja
      }

      try {
        console.log(`Intentando recuperar contraseña con la llave de fallback...`);
        const plainTextPassword = decryptOld(user.emailPasswordEncrypted);
        console.log(`✅ Contraseña recuperada exitosamente.`);
        
        console.log(`Re-encriptando con la llave segura de .env...`);
        const newEncrypted = encryptNew(plainTextPassword);
        
        await prisma.user.update({
          where: { id: user.id },
          data: { emailPasswordEncrypted: newEncrypted }
        });
        console.log(`🎉 Contraseña actualizada y guardada correctamente para ${user.email}.`);
      } catch (e) {
        console.error(`❌ No se pudo desencriptar ni con la llave nueva ni con la vieja. Error: ${e.message}`);
      }
    }
    
    console.log("\n=== PROCESO TERMINADO ===");
  } catch (error) {
    console.error("Error fatal:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
