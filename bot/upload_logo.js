require('dotenv').config({path: './.env'});
const cloudinary = require('./config/cloudinary');
const db = require('./config/database');

const filePath = 'C:\\Users\\ASUS\\Downloads\\photo_2026-08-16_21-48-28.jpg';

async function run() {
  try {
    console.log('Uploading image to Cloudinary...');
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'shop_assets',
      public_id: 'marun_logo_' + Date.now(),
    });
    
    console.log('Upload successful. URL:', result.secure_url);
    
    console.log('Updating settings in database...');
    await db.query("UPDATE settings SET value = $1 WHERE key = 'shop_logo_url'", [result.secure_url]);
    
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
