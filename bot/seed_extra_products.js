const { addProduct } = require('./db');

const newProducts = [
  { name: 'Strawberry Cloud Perfume', price: 25.00, category: 'ទឹកអប់ (Perfume)', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=200', stock: 15 },
  { name: 'Vanilla Dream Lotion', price: 18.50, category: 'ឡេ (Lotion)', image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&q=80&w=200', stock: 20 },
  { name: 'Sparkling Peach Mist', price: 15.00, category: 'ស្ព្រៃយ៍ (Bodyspray)', image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=200', stock: 12 },
  { name: 'Midnight Rose Scent', price: 28.00, category: 'ទឹកអប់ (Perfume)', image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=200', stock: 8 },
  { name: 'Cherry Blossom Butter', price: 20.00, category: 'ឡេ (Lotion)', image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=200', stock: 10 },
  { name: 'Lavender Breeze Spray', price: 14.50, category: 'ស្ព្រៃយ៍ (Bodyspray)', image: 'https://images.unsplash.com/photo-1601648764658-cf37e8c89b70?auto=format&fit=crop&q=80&w=200', stock: 25 },
  { name: 'Honey Glow Serum', price: 32.00, category: 'ឡេ (Lotion)', image: 'https://images.unsplash.com/photo-1596462502278-27bfaf410911?auto=format&fit=crop&q=80&w=200', stock: 5 },
  { name: 'Blueberry Pop Lotion', price: 17.00, category: 'ឡេ (Lotion)', image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=200', stock: 18 },
  { name: 'Golden Amber Perfume', price: 35.00, category: 'ទឹកអប់ (Perfume)', image: 'https://images.unsplash.com/photo-1587011740428-2b740529cc24?auto=format&fit=crop&q=80&w=200', stock: 6 },
  { name: 'Minty Fresh Body Mist', price: 12.00, category: 'ស្ព្រៃយ៍ (Bodyspray)', image: 'https://images.unsplash.com/photo-1557170334-a9632e77c6e4?auto=format&fit=crop&q=80&w=200', stock: 30 }
];

async function seed() {
  console.log('🌱 កំពុងបញ្ចូលទំនិញថ្មី ១០ មុខ...');
  for (const p of newProducts) {
    try {
      const inserted = await addProduct(p);
      console.log(`✅ បញ្ចូលរួចរាល់: ${inserted.name}`);
    } catch (e) {
      console.error(`❌ បញ្ចូលបរាជ័យ ${p.name}:`, e.message);
    }
  }
  console.log('✨ រួចរាល់សព្វគ្រប់!');
  process.exit();
}

seed();
