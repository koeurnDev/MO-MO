const { redisRest } = require('../config/redis');

const globalLimiter = async (req, res, next) => {
  // 🛡️ Use REST client for rate limiting
  if (!redisRest) return next();
  
  const ip = req.ip || req.socket.remoteAddress;
  
  // 🛡️ Whitelist local development traffic
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  if (isDev && (ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost'))) {
    return next();
  }

  const key = `rate:global:${ip}`;
  
  try {
    const count = await redisRest.incr(key);
    
    // 🛡️ Ensure key ALWAYS has an expiration (Fixes potential race condition)
    if (count === 1) {
      await redisRest.expire(key, 60);
    } else {
      // Periodic check to ensure TTL is set even if first request failed to set it
      const ttl = await redisRest.ttl(key);
      if (ttl < 0) await redisRest.expire(key, 60);
    }
    
    if (count > 300) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please slow down.' });
    }
    next();
  } catch (err) {
    // 🛡 Fail-Open: Allow request if Redis is down, but keep it logged
    console.warn(`🚨 Rate Limit Offline (REST): ${err.message}`);
    next();
  }
};

const orderCreationLimiter = async (req, res, next) => {
  if (!redisRest) return next();
  
  const ip = req.ip || req.socket.remoteAddress;
  const key = `rate:order:${ip}`;
  
  try {
    const count = await redisRest.incr(key);
    if (count === 1) await redisRest.expire(key, 600); // 10 minutes
    
    if (count > 5) {
      return res.status(429).json({ success: false, error: 'Too many orders. Please wait.' });
    }
    next();
  } catch (err) {
    console.error('🔴 Order Rate Limit Fail (REST):', err);
    next();
  }
};

module.exports = { globalLimiter, orderCreationLimiter };
