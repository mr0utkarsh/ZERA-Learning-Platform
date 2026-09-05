/**
 * Symmetric encryption for secrets stored server-side (e.g. admin-configured
 * AI API keys). AES-256-GCM with a fresh random IV per value.
 *
 * The encryption key is derived (scrypt) from CONFIG_ENCRYPTION_KEY when set,
 * otherwise from JWT_SECRET. Secrets are only ever held in memory/DB in
 * encrypted form — never logged, never returned in full by any API.
 */
const crypto = require('crypto');
const config = require('../config');

const ALGO = 'aes-256-gcm';
const SALT = Buffer.from('zera-admin-setting-v1', 'utf8'); // fixed salt; secrecy comes from the key material
const PREFIX = 'enc:v1:';

let cachedKey = null;

function getKey() {
  if (cachedKey) return cachedKey;
  const secret = process.env.CONFIG_ENCRYPTION_KEY || config.jwtSecret;
  if (!secret || secret === 'zera-insecure-dev-secret') {
    // Still functional for dev, but refuse in production without a real secret.
    if (config.isProduction() && !process.env.CONFIG_ENCRYPTION_KEY) {
      throw new Error('CONFIG_ENCRYPTION_KEY must be set in production to store secrets');
    }
  }
  cachedKey = crypto.scryptSync(String(secret), SALT, 32);
  return cachedKey;
}

/** Encrypt a plaintext string -> opaque token string. */
function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
}

/** Decrypt a token produced by encryptSecret. Returns null if invalid/tampered. */
function decryptSecret(token) {
  try {
    if (typeof token !== 'string' || !token.startsWith(PREFIX)) return null;
    const raw = Buffer.from(token.slice(PREFIX.length), 'base64');
    if (raw.length < 29) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

function isEncryptedToken(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

module.exports = { encryptSecret, decryptSecret, isEncryptedToken };
