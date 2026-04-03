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
    
  // 6. Compare hashes
  return calculatedHash === hash;
}

module.exports = { validateInitData };
