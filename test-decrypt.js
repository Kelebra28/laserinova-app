require('dotenv').config();
const crypto = require('crypto');
function decrypt(text) {
  const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET;
  if (!ENCRYPTION_KEY) throw new Error('No secret');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const textParts = text.split(':');
  if (textParts.length !== 3) throw new Error('Invalid format');
  const iv = Buffer.from(textParts[0], 'hex');
  const authTag = Buffer.from(textParts[1], 'hex');
  const encryptedText = Buffer.from(textParts[2], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
console.log(decrypt('bb5ded52f8633539775b76a0:c20fc1798dee7943974725c9cc35cb14:f906d07aa41f763398c8d7f9b131a2'));
