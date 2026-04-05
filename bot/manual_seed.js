const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const newProducts = [
  { name: 'Rose Elegance Perfume', price: 85, category: 'perfume', image: 'http://localhost:3000/uploads/perfume.png', stock: 12 },
  { name: 'Pure Eucalyptus Lotion', price: 45, category: 'bodycare', image: 'http://localhost:3000/uploads/lotion.png', stock: 15 },
  { name: 'Midnight Gold Luxe Candle', price: 35, category: 'perfume', image: 'http://localhost:3000/uploads/candle.png', stock: 8 },
  { name: 'Serenity Lavender Oil', price: 25, category: 'bodycare', image: 'http://localhost:3000/uploads/oil.png', stock: 20 },
  { name: 'Grand Boutique Gift Set', price: 150, category: 'new', image: 'http://localhost:3000/uploads/giftset.png', stock: 5 }
];

async function run() {
  console.log('💎 Connecting to Neon DB...');
  const client = await pool.connect();
  try {
    console.log('🗑 Clearing products...');
    await client.query('DELETE FROM products');
    
    for (const p of newProducts) {
      await client.query(
        'INSERT INTO products (name, price, category, image, stock) VALUES ($1, $2, $3, $4, $5)',
        [p.name, p.price, p.category, p.image, p.stock]
      );
      console.log(`✅ Inserted: ${p.name}`);
    }
    console.log('✨ MO MO Store is now STOCK READY!');
  } catch (err) {
    console.error('❌ Error during manual seed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
