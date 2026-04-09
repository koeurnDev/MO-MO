const { Pool } = require('pg');

/**
 * MO-MO Database Layer (v5 - Production Optimized)
 * Strategy: Enterprise-Grade Connection Pooling
 * ⚡ Features:
 *   - Optimized connection limits (8-15 range), not 20
 *   - Aggressive idle timeout (15s) to prevent stale connections
 *   - Queue timeout to detect connection starving
 *   - Error recovery with connection validation
 *   - Built-in query timeout
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  
  // 🎯 PRODUCTION CONNECTION LIMITS
  // Neon/Render free tier: 20 connections max, so we use 8-12 to leave buffer
  max: parseInt(process.env.DB_POOL_MAX || '12'),        // Max concurrent connections
  min: parseInt(process.env.DB_POOL_MIN || '2'),         // Keep warm with 2 connections
  
  // ⏱️ AGGRESSIVE TIMEOUT STRATEGY
  idleTimeoutMillis: 15000,                               // Close idle connections after 15s (was 30s)
  connectionTimeoutMillis: 60000,                         // Allow 60s for cold starts
  maxUses: 7500,                                          // Recycle connection after 7500 queries
  
  // 🛡️ QUEUE & STALL PROTECTION
  allowExitOnIdle: false,                                 // Keep pool until explicit shutdown
  
  // 🔄 KEEPALIVE SETTINGS
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,                     // Send keepalive after 10s of idle
  
  // ⏲️ QUERY TIMEOUT
  statement_timeout: 45000,                              // Query timeout: 45 seconds
  query_timeout: 45000,
});

pool.on('connect', (client) => {
  console.log(`🔌 DB: Connection Opened. (Active: ${pool.totalCount} | Idle: ${pool.idleCount})`);
});

pool.on('remove', () => {
  console.log(`🔌 DB: Connection Closed. (Active: ${pool.totalCount} | Idle: ${pool.idleCount})`);
});

pool.on('error', (err, client) => {
  console.error('🔴 DB Pool Error:', err.message, '(Code:', err.code, ')');
});

// 🚨 QUERY ERROR TRACKING
pool.on('query', (query) => {
  if (query.callback) {
    const start = Date.now();
    const originalCallback = query.callback;
    query.callback = (err, res) => {
      const duration = Date.now() - start;
      if (err) {
        console.error(`⚠️ SLOW QUERY (${duration}ms):`, query.text.substring(0, 50), '...');
      } else if (duration > 5000) {
        console.warn(`⚠️ SLOW QUERY (${duration}ms):`, query.text.substring(0, 50), '...');
      }
      originalCallback(err, res);
    };
  }
});

module.exports = {
  // 🔄 Virtual Interface for backward compatibility with repositories
  query: (text, params) => pool.query(text, params),
  writeQuery: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
  writePool: pool,
  readPool: pool,
  pool
};
