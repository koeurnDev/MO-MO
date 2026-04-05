const { addProduct, getProducts, deleteProduct } = require('./db');

async function seed() {
  console.log('🚀 Seeding MO MO Luxury Boutique...');
  
  // Clear any existing products
  const current = await getProducts();
  for (const p of current) {
    await deleteProduct(p.id);
  }

  const newProducts = [
    { name: 'Rose Elegance Perfume', price: 85, category: 'perfume', image: 'http://localhost:3000/uploads/perfume.png', stock: 12 },
    { name: 'Pure Eucalyptus Lotion', price: 45, category: 'bodycare', image: 'http://localhost:3000/uploads/lotion.png', stock: 15 },
    { name: 'Midnight Gold Luxe Candle', price: 35, category: 'perfume', image: 'http://localhost:3000/uploads/candle.png', stock: 8 },
    { name: 'Serenity Lavender Oil', price: 25, category: 'bodycare', image: 'http://localhost:3000/uploads/oil.png', stock: 20 },
    { name: 'Grand Boutique Gift Set', price: 150, category: 'new', image: 'http://localhost:3000/uploads/giftset.png', stock: 5 }
  ];

  for (const p of newProducts) {
    await addProduct(p);
    console.log(`✅ Added: ${p.name}`);
  }

  console.log('✨ MO MO Store is now fully stocked with Luxury Products!');
  process.exit(0);
}

seed();
