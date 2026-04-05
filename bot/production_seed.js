const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Database Configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const products = [
  {
    name: 'Rose Elegance Perfume',
    price: 85,
    category: 'perfume',
    image: 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\71bda141-da48-4c7f-9502-8eff962454db\\luxury_perfume_1_1775220665434.png',
    stock: 12,
    description: 'A delicate blend of red roses and morning dew.'
  },
  {
    name: 'Pure Eucalyptus Lotion',
    price: 45,
    category: 'bodycare',
    image: 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\71bda141-da48-4c7f-9502-8eff962454db\\luxury_lotion_2_1775220684454.png',
    stock: 15,
    description: 'Refreshing body lotion for ultimate skin hydration.'
  },
  {
    name: 'Midnight Gold Luxe Candle',
    price: 35,
    category: 'perfume',
    image: 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\71bda141-da48-4c7f-9502-8eff962454db\\luxury_candle_3_1775220702680.png',
    stock: 8,
    description: 'Set the mood with gold-flecked midnight scent.'
  },
  {
    name: 'Serenity Lavender Oil',
    price: 25,
    category: 'bodycare',
    image: 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\71bda141-da48-4c7f-9502-8eff962454db\\luxury_oil_4_1775220718990.png',
    stock: 20,
    description: 'Calming lavender oil for relaxation and sleep.'
  },
  {
    name: 'Grand Boutique Gift Set',
    price: 150,
    category: 'new',
    image: 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\71bda141-da48-4c7f-9502-8eff962454db\\luxury_giftset_5_1775220734578.png',
    stock: 5,
    description: 'The ultimate MO MO luxury experience in a box.'
  }
];

async function seed() {
  console.log('🚀 Starting MO MO Production Seed...');
  
  try {
    const client = await pool.connect();
    console.log('📦 Cleaning products table...');
    await client.query('DELETE FROM products');

    for (const p of products) {
      console.log(`📤 Uploading image for ${p.name}...`);
      const upload = await cloudinary.uploader.upload(p.image, {
        folder: 'mo_mo_boutique',
        use_filename: true,
        unique_filename: false
      });
      
      const cloudinaryUrl = upload.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
      console.log(`✅ Uploaded to: ${cloudinaryUrl}`);

      console.log(`💾 Inserting ${p.name} into database...`);
      await client.query(
        'INSERT INTO products (name, price, category, image, stock) VALUES ($1, $2, $3, $4, $5)',
        [p.name, p.price, p.category, cloudinaryUrl, p.stock]
      );
      console.log(`🎉 Seeded ${p.name} successfully!`);
    }

    console.log('\n✨ PRODUCTION SEED COMPLETE ✨');
    client.release();
  } catch (error) {
    console.error('❌ Production Seed Failed:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seed();
