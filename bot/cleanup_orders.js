require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function cleanup() {
  const client = await pool.connect();
  try {
    console.log('🔄 [DB] Starting Cleanup...');
    
    // 1. Delete all Pending orders older than 1 hour (Test orders)
    const res1 = await client.query("DELETE FROM orders WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour'");
    console.log(`✅ Deleted ${res1.rowCount} old pending orders.`);

    // 2. Delete all orders with numeric IDs or short IDs (Legacy)
    const res2 = await client.query("DELETE FROM orders WHERE order_code IS NULL OR length(order_code) < 10");
    console.log(`✅ Deleted ${res2.rowCount} legacy/short-ID orders.`);

    console.log('✨ [DB] Cleanup finished successfully!');
  } catch (err) {
    console.error('❌ [DB] Cleanup failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup();
