const cloudinary = require('cloudinary').v2;
const { Pool } = require('pg');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure DB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const images = [
  { name: 'Rose Elegance Perfume', file: 'uploads/perfume.png' },
  { name: 'Pure Eucalyptus Lotion', file: 'uploads/lotion.png' },
  { name: 'Midnight Gold Luxe Candle', file: 'uploads/candle.png' },
  { name: 'Serenity Lavender Oil', file: 'uploads/oil.png' },
  { name: 'Grand Boutique Gift Set', file: 'uploads/giftset.png' }
];

async function syncToCloud() {
  console.log('--- Starting Cloud Sync ---');
  
  for (const img of images) {
    try {
      console.log(`Uploading ${img.name}...`);
      const result = await cloudinary.uploader.upload(img.file, {
        folder: 'products',
        use_filename: true,
        unique_filename: false
      });
      
      console.log(`Success! URL: ${result.secure_url}`);
      
      // Update DB
      await pool.query(
        'UPDATE products SET image = $1 WHERE name = $2',
        [result.secure_url, img.name]
      );
      console.log(`Updated database for ${img.name}`);
      
    } catch (err) {
      console.error(`Failed to sync ${img.name}:`, err.message);
    }
  }
  
  console.log('--- Sync Completed ---');
  process.exit(0);
}

syncToCloud();
