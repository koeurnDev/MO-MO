const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const sqlPath = path.join(__dirname, 'migrations', '03_security_indexes.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('⏳ Running migration: 03_security_indexes.sql...');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅ Migration successful!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
