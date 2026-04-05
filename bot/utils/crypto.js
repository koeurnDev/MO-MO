const crypto = require('crypto');
require('dotenv').config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Encrypts sensitive text using a secret SECURITY_PEPPER
 * @param {string} text - The raw text to encrypt
 * @returns {string} - The combined IV:Tag:Salt:EncryptedData
 */
function encrypt(text) {
  if (!text) return text;
  
  const pepper = process.env.SECURITY_PEPPER || 'mo_mo_default_pepper_key_32_chars_123';
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  // Use Pepper as key or derive from it
  const key = crypto.scryptSync(pepper, salt, 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Return IV:Tag:Salt:EncryptedData
  return `${iv.toString('hex')}:${tag.toString('hex')}:${salt.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts text back to original form
 * @param {string} cipherText - The IV:Tag:Salt:EncryptedData string
 * @returns {string} - The original raw text
 */
function decrypt(cipherText) {
  if (!cipherText || !cipherText.includes(':')) return cipherText;
  
  try {
    const pepper = process.env.SECURITY_PEPPER || 'mo_mo_default_pepper_key_32_chars_123';
    const [ivHex, tagHex, saltHex, encryptedHex] = cipherText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const salt = Buffer.from(saltHex, 'hex');
    
    const key = crypto.scryptSync(pepper, salt, 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    // If decryption fails, return original (useful if some data is not yet encrypted)
    return cipherText;
  }
}

module.exports = { encrypt, decrypt };
