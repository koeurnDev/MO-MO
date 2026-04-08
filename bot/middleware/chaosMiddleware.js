/**
 * MO-MO Elite Chaos Engineering Middleware
 * Goal: Deliberately inject system entropy to verify frontend resilience hooks.
 * Controlled via Backend Feature Flags.
 */

const chaosMiddleware = (req, res, next) => {
  // 🐒 Chaos Monkey: Pull settings from some source (or process.env)
  const CHAOS_MODE = process.env.CHAOS_MODE === 'true';
  const CHAOS_LATENCY = parseInt(process.env.CHAOS_LATENCY_MS || '0');
  const CHAOS_ERROR_RATE = parseFloat(process.env.CHAOS_ERROR_RATE || '0'); // 0 to 1

  if (!CHAOS_MODE) return next();

  // 1. Inject Deterministic Latency (Simulate heavy DB/Sync lag)
  const wait = CHAOS_LATENCY > 0 ? CHAOS_LATENCY : 0;
  
  // 2. Inject Faults (Simulate 500 errors)
  const shouldFail = Math.random() < CHAOS_ERROR_RATE;

  setTimeout(() => {
    if (shouldFail) {
      console.warn(`🐒 CHAOS: Injected Fault at ${req.originalUrl}`);
      return res.status(500).json({ 
        success: false, 
        error: 'CHAOS_ENGINEERING_FAULT',
        message: '🐒 The Chaos Monkey has disconnected your database.' 
      });
    }
    next();
  }, wait);
};

module.exports = chaosMiddleware;
