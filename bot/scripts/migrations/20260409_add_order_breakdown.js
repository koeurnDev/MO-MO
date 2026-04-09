require('dotenv').config({ path: './.env' }); // 👈 Fixed path relative to CWD d:\MO_MO\bot
const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
console.log('🔗 URL Detected:', url ? `${url.substring(0, 20)}...` : 'MISSING');

const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('🚀 Starting Database Migration: Enriching Orders table...');
  try {
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    
    await client.query('BEGIN');

    console.log('📦 Adding financial columns...');
    
    // Check if columns exist first 
    const checkCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name IN ('subtotal', 'discount_amount', 'delivery_fee', 'gross_total')
    `);
    
    const existingCols = checkCols.rows.map(r => r.column_name);

    if (!existingCols.includes('subtotal')) {
      await client.query('ALTER TABLE orders ADD COLUMN subtotal DECIMAL(12,2) DEFAULT 0');
      console.log('✅ Added: subtotal');
    }
    if (!existingCols.includes('discount_amount')) {
      await client.query('ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(12,2) DEFAULT 0');
      console.log('✅ Added: discount_amount');
    }
    if (!existingCols.includes('delivery_fee')) {
      await client.query('ALTER TABLE orders ADD COLUMN delivery_fee DECIMAL(12,2) DEFAULT 0');
      console.log('✅ Added: delivery_fee');
    }
    if (!existingCols.includes('gross_total')) {
      await client.query('ALTER TABLE orders ADD COLUMN gross_total DECIMAL(12,2) DEFAULT 0');
      console.log('✅ Added: gross_total');
    }

    // Update existing orders: subtotal = total, others = 0
    console.log('🔄 Data Patch: Updating existing orders...');
    await client.query('UPDATE orders SET subtotal = total WHERE subtotal = 0 OR subtotal IS NULL');
    await client.query('UPDATE orders SET gross_total = total WHERE gross_total = 0 OR gross_total IS NULL');

    await client.query('COMMIT');
    console.log('🎉 Migration Successful!');
    client.release();
  } catch (err) {
    if (err.message.includes('password')) {
       console.error('❌ Authentication failed. Check your DATABASE_URL.');
    } else {
       console.error('❌ Migration Failed:', err.message);
    }
  } finally {
    pool.end();
  }
}

migrate();
