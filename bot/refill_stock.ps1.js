const { pool } = require('./db');

async function refillStock() {
  try {
    const res = await pool.query('UPDATE products SET stock = 100 RETURNING id, name, stock');
    console.log(`Successfully refilled stock for ${res.rowCount} products.`);
    process.exit(0);
  } catch (err) {
    console.error('Refill failed:', err);
    process.exit(1);
  }
}

refillStock();
