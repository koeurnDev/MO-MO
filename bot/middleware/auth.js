const jwt = require('jsonwebtoken');
const { validateInitData } = require('../utils/auth');

/**
 * Principal-Grade Security Layer (V2)
 * Features: Short-lived JWT Session Tokens, Telegram HMAC Validation, and Dev Bypass.
 * Zero-Trust Session Management.
 */

const SESSION_SECRET = process.env.SESSION_SECRET || 'momo_secret_2024_!@#';
const SESSION_EXPIRY = '2h'; // Short sessions for maximum safety

const checkBypass = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const isBypassEnabled = process.env.DEBUG_ADMIN_BYPASS === 'true';
  // 🛡 Security: Bypass MUST be disabled in production regardless of flag
  if (isProd) return false;
  return isBypassEnabled;
};

/**
 * Middleware: verifyUser
 * Authenticates requests via X-TG-Data (Direct Telegram) or Authorization (JWT).
 */
const verifyUser = (req, res, next) => {
  const authHeader = req.get('Authorization');
  const initData = req.get('X-TG-Data');

  // 1. Direct Telegram InitData validation
  if (initData) {
    const isValid = validateInitData(initData, process.env.BOT_TOKEN);
    if (!isValid && !checkBypass()) {
      return res.status(401).json({ success: false, error: 'Invalid Session' });
    }

    const params = new URLSearchParams(initData || '');
    const user = JSON.parse(params.get('user') || '{}');
    
    // 🛡 Sync: If it's first-time or refresh, generate a transient session token
    const token = jwt.sign({ id: user.id, username: user.username }, SESSION_SECRET, { expiresIn: SESSION_EXPIRY });
    res.set('X-Session-Token', token);
    
    req.user = { user_id: Number(user.id), ...user };
    req.tgUser = user;
    return next();
  }

  // 2. JWT Session Token validation (Fast path)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, SESSION_SECRET);
      req.user = { user_id: decoded.id, username: decoded.username };
      return next();
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Session Expired', code: 'TOKEN_EXPIRED' });
    }
  }

  // 3. Last Resort: Dev Bypass
  if (checkBypass()) {
    console.warn('🛠️ Auth: Debug Bypass Active');
    const devUser = { id: Number(process.env.SUPERADMIN_ID), first_name: 'DevTester' };
    req.user = { user_id: devUser.id, ...devUser };
    req.tgUser = devUser;
    return next();
  }

  return res.status(401).json({ success: false, error: 'Auth Required' });
};

const isAdmin = (req, res, next) => {
  // Principal: Re-use verifyUser logic then check SuperAdmin ID
  verifyUser(req, res, () => {
    if (Number(req.user.user_id) === Number(process.env.SUPERADMIN_ID)) {
      return next();
    }
    res.status(403).json({ success: false, error: 'Access Denied' });
  });
};

module.exports = { isAdmin, verifyUser };
