const crypto = require('crypto');

/**
 * Validates Telegram Mini App InitData
 * @param {string} telegramInitData - Raw initData string from the client
 * @param {string} botToken - Telegram Bot Token
 * @returns {boolean} - True if authentic, false otherwise
 */
function validateInitData(telegramInitData, botToken) {
  if (!telegramInitData || !botToken) return false;

  const initData = new URLSearchParams(telegramInitData);
  const hash = initData.get('hash');
  
  if (!hash) return false;

  // 1. Remove hash from parameters
  initData.delete('hash');
  
  // 2. Sort parameters alphabetically
  const sortedKeys = Array.from(initData.keys()).sort();
  
  // 3. Create data-check-string (key=value joined by \n)
  const dataCheckString = sortedKeys
    .map((key) => `${key}=${initData.get(key)}`)
    .join('\n');
    
  // 4. Generate Secret Key: HMAC-SHA256("WebAppData", botToken)
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
    
  // 5. Generate validation hash: HMAC-SHA256(data-check-string, secretKey)
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
    
  // 6. Compare hashes securely
  const hashBuffer = Buffer.from(hash, 'hex');
  const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

  if (hashBuffer.length !== 32 || calculatedBuffer.length !== 32) return false;
  if (!crypto.timingSafeEqual(hashBuffer, calculatedBuffer)) return false;

  // 7. Check for expiration (Replay Protection)
  const authDate = parseInt(initData.get('auth_date'), 10);
  if (!authDate || isNaN(authDate)) return false;

  const now = Math.floor(Date.now() / 1000);
  
  // 🛡 Security Fix: Reject future dates (> 60s from now) and old sessions (> 24h)
  if (authDate > (now + 60) || (now - authDate) > 86400) { 
    console.error('🔴 Telegram Session Invalid/Expired:', { now, authDate });
    return false;
  }

  return true;
}

module.exports = { validateInitData };
