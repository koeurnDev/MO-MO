require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost')) ? false : {
    rejectUnauthorized: false
  }
});

async function seedStats() {
  console.log('🚀 Seeding Premium Stats (Reviews & Orders)...');
  const client = await pool.connect();

  try {
    const productsRes = await client.query('SELECT id, name FROM products');
    const products = productsRes.rows;

    if (products.length === 0) {
      console.log('❌ No products found to seed.');
      return;
    }

    console.log(`🔍 Found ${products.length} products.`);

    for (const prod of products) {
      // 1. Seed some realistic reviews
      const reviewCount = Math.floor(Math.random() * 15) + 10; // 10-25 reviews
      console.log(`✍️ Adding ${reviewCount} reviews for ${prod.name}...`);
      
      for (let i = 0; i < reviewCount; i++) {
        const rating = Math.floor(Math.random() * 2) + 4; // Mostly 4-5 stars for luxury
        await client.query(
          'INSERT INTO reviews (product_id, user_name, rating, comment) VALUES ($1, $2, $3, $4)',
          [prod.id, `User_${Math.random().toString(36).substring(7)}`, rating, 'Amazing quality, worth every penny! ✨']
        );
      }

      // 2. Seed some completed orders to boost "Units Sold"
      const salesCount = Math.floor(Math.random() * 30) + 20; // 20-50 units sold
      console.log(`🛍️ Adding ${salesCount} mock sales for ${prod.name}...`);
      
      for (let i = 0; i < 5; i++) { // Add 5 bulk orders instead of 50 individual for speed
         const qty = Math.floor(salesCount / 5);
         const orderData = JSON.stringify([{ id: prod.id, name: prod.name, quantity: qty, price: 10 }]);
         await client.query(
           "INSERT INTO orders (user_name, items, status, total) VALUES ($1, $2, 'paid', $3)",
           [`Buyer_${i}`, orderData, 100]
         );
      }
    }

    console.log('✅ Seeding complete! Product stats will now be dynamic.');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedStats();
