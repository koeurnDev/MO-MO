require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function migrate() {
  const migrationPath = path.join(__dirname, '../migrations/02_materialized_views.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    console.log('⏳ Running migration: 02_materialized_views.sql...');
    await pool.query(sql);
    console.log('✅ Migration completed successfully.');
  } catch (err) {
    console.error('🔴 Migration failed:', err.message);
  } finally {
    process.exit();
  }
}

migrate();
