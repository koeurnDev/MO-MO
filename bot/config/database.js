const { Pool } = require('pg');

/**
 * MO-MO Stabilized Database Layer (v4)
 * Strategy: Single-Pool Resilience (Optimized for Free Tier / NEON)
 * Reverts Dual-Pool to prevent connection exhaustion while keeping the standard interface.
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // 🛡️ Stabilized Limits: Stay under NEON free-tier max connections
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000, /* ⏳ Increased to 60s for Neon cold starts */
  // 🔄 Keepalive settings for long-lived connections
  keepAlive: true,
  statement_timeout: 45000,
});

pool.on('connect', () => {
  console.log('🔌 DB: Stabilized Pool Connection Opened.');
});

pool.on('error', (err) => console.error('🔴 DB Pool Error:', err));

module.exports = {
  // 🔄 Virtual Interface for backward compatibility with repositories
  query: (text, params) => pool.query(text, params),
  writeQuery: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
  writePool: pool,
  readPool: pool,
  pool
};
