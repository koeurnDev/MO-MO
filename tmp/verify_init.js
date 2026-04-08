const db = require('../bot/db');

async function check() {
  console.log('⏳ Checking DB Init status...');
  try {
    await db.initPromise;
    console.log('✅ db.initPromise RESOLVED successfully.');
    
    // Test a query
    const res = await db.getProducts();
    console.log(`✅ getProducts() works. Count: ${res.length}`);
    
    const ana = await db.getAnalytics();
    console.log('✅ getAnalytics() works.');
    
  } catch (err) {
    console.error('❌ db.initPromise REJECTED.');
    console.error('Error Stack:', err.stack);
  }
  process.exit(0);
}

check();
