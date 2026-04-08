const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function purge() {
  try {
    const res = await pool.query("UPDATE products SET additional_images = '[]' WHERE additional_images LIKE '%dmshisvpw%'");
    console.log(`✅ Purged stale images from ${res.rowCount} products.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

purge();
