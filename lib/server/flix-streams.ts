import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.FLIX_STREAMS_ENCRYPTION_KEY || '12345678901234567890123456789012';
const IV_LENGTH = 16;
let hasWarnedAboutDefaultEncryptionKey = false;

const getEncryptionKey = () => {
  if (!process.env.FLIX_STREAMS_ENCRYPTION_KEY && !hasWarnedAboutDefaultEncryptionKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing FLIX_STREAMS_ENCRYPTION_KEY in production.');
    }

    hasWarnedAboutDefaultEncryptionKey = true;
    console.warn('Missing FLIX_STREAMS_ENCRYPTION_KEY. Falling back to the default key is insecure.');
  }

  return Buffer.from(ENCRYPTION_KEY);
};

export function encryptFlixStreamsAddonUrl(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptFlixStreamsAddonUrl(text: string): string {
  if (!text) return '';

  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift() || '', 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Failed to decrypt URL', error);
    return '';
  }
}
