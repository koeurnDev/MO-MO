require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = require('../config/database');

async function seed() {
  try {
    const res = await pool.query('SELECT id, name FROM products LIMIT 5');
    console.log('Products:', res.rows);

    if (res.rows.length > 0) {
      const productId = res.rows[0].id;
      const images = [
        'https://res.cloudinary.com/dhabxzsx7/image/upload/v1775451236/products/klvf8fbcwtyhmtjjltas.jpg',
        'https://res.cloudinary.com/dhabxzsx7/image/upload/v1775544051/products/pxeyqwusoz7k2a04ghzr.jpg',
        'https://res.cloudinary.com/dhabxzsx7/image/upload/f_auto,q_auto/v1775224572/mo_mo_boutique/luxury_lotion_2_1775220684454.jpg'
      ];
      
      await pool.query('UPDATE products SET additional_images = $1 WHERE id = $2', [JSON.stringify(images), productId]);
      console.log(`✅ Updated product ${res.rows[0].name} (ID: ${productId}) with 3 images.`);
    }
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    process.exit(0);
  }
}

seed();
