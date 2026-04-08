/**
 * 🛡 Senior 20-Year Exp: Security Sanitization Utility
 * Prevents XSS and simple injection attacks by stripping HTML and escaping special characters.
 */

const sanitize = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/[&<>"']/g, function(m) { // Escape special characters
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m];
    })
    .trim();
};

/**
 * Sanitize an entire object of string values
 */
const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitize(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  return sanitized;
};

module.exports = { sanitize, sanitizeObject };
