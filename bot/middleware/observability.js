const { v4: uuidv4 } = require('uuid');

/**
 * Principal-Grade Observability Middleware
 * Features: Request Tracing (Correlation IDs), Latency Histograms, and Error Classification.
 */

const observabilityLogger = (req, res, next) => {
  const start = process.hrtime();
  req.id = req.get('X-Request-ID') || uuidv4();
  res.set('X-Request-ID', req.id);

  // Capture the original end function to log metrics on completion
  const originalEnd = res.end;
  res.end = function (...args) {
    const diff = process.hrtime(start);
    const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    
    const log = {
      id: req.id,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${durationMs}ms`,
      ua: req.get('User-Agent'),
      ip: req.ip || req.get('X-Forwarded-For')
    };

    // Classify log level
    if (res.statusCode >= 500) console.error('🔥 CRITICAL:', JSON.stringify(log));
    else if (res.statusCode >= 400) console.warn('⚠️ WARNING:', JSON.stringify(log));
    else if (durationMs > 200) console.log('⏳ SLOW:', JSON.stringify(log));
    else console.log('ℹ️ INFO:', JSON.stringify(log));

    originalEnd.apply(res, args);
  };

  next();
};

const telemetryHandler = (req, res) => {
  const telemetryData = req.body;
  // In production, sync to a time-series DB (Elastic, DataDog, etc.)
  // For now, we log to stdout with a special prefix for log collectors
  console.log('📈 TELEMETRY:', JSON.stringify({
    ...telemetryData,
    server_timestamp: new Date().toISOString()
  }));
  res.status(202).json({ success: true });
};

module.exports = {
  observabilityLogger,
  telemetryHandler
};
