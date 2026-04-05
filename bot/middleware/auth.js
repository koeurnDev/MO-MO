const { validateInitData } = require('../utils/auth');

/**
 * Middleware to verify if the request comes from the SuperAdmin.
 * It also supports an ADMIN_SECRET fallback for local development.
 */
const isAdmin = (req, res, next) => {
  // --- TEMPORARY BYPASS REMOVED FOR PRODUCTION SECURITY ---

  const initData = req.headers['x-tg-data'];
  const adminSecret = process.env.ADMIN_SECRET || 'mo_mo_admin_dev';

  // 1. Allow if ADMIN_SECRET matches (for local development testing)
  if (initData === adminSecret) {
    return next();
  }

  // 2. Otherwise, perform strict Telegram validation
  if (!initData) return res.status(403).json({ success: false, error: 'Unauthorized' });

  const isValid = validateInitData(initData, process.env.BOT_TOKEN);
  if (!isValid) return res.status(401).json({ success: false, error: 'Invalid Session' });

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user') || '{}');

  if (Number(user.id) === Number(process.env.SUPERADMIN_ID)) {
    return next();
  }

  res.status(403).json({ success: false, error: 'Access Denied' });
};

module.exports = { isAdmin };
