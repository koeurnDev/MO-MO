const express = require('express');
const router = express.Router();
const { telemetryHandler } = require('../middleware/observability');

/**
 * Principal-Level System Management Routes
 */

// 1. Feature Flag endpoint (Static for now, can be moved to DB)
router.get('/flags', (req, res) => {
  res.json({
    success: true,
    flags: {
      BETA_WISH_LIST: true,
      NEW_CHECKOUT_FLOW: true,
      PREMIUM_ADMIN_STATS: false,
      MAINTENANCE_MODE: false
    }
  });
});

// 2. Client Telemetry Ingestion
router.post('/telemetry', telemetryHandler);

module.exports = router;
