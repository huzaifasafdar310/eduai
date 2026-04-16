import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Bytes
const TAG_LENGTH = 16; // Bytes

if (!ENCRYPTION_SECRET || ENCRYPTION_SECRET.length < 32) {
  throw new Error('CRITICAL: ENCRYPTION_SECRET must be at least 32 characters long in .env');
}

/**
 * 🔒 encrypt: Authoritative AES-256-GCM Encryption
 * Formats output as IV:TAG:CONTENT (Hex)
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_SECRET as string, 'hex').slice(0, 32), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * 🔓 decrypt: Authoritative AES-256-GCM Decryption
 * Expects format IV:TAG:CONTENT (Hex)
 */
export function decrypt(data: string): string {
  const [ivHex, tagHex, encryptedHex] = data.split(':');
  
  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error('Invalid encryption format. Expected IV:TAG:CONTENT');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_SECRET as string, 'hex').slice(0, 32), iv);
  
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
