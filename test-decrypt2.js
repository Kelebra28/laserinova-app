require('dotenv').config();
const crypto = require('crypto');
function decrypt(encryptedText) {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development';
  const key = crypto.createHash('sha256').update(secret).digest();
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
console.log(decrypt('bb5ded52f8633539775b76a0:c20fc1798dee7943974725c9cc35cb14:f906d07aa41f763398c8d7f9b131a2'));
