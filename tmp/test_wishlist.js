require('dotenv').config({ path: 'd:/MO_MO/bot/.env' });
const db = require('d:/MO_MO/bot/db');

async function runTest() {
  console.log('🧪 Starting Wishlist Diagnostics...');
  try {
    await db.initPromise;
    const userId = 'test_user_7817470099';
    const productId = 1; // Assuming product 1 exists

    console.log('1. Toggling wishlist (Add)...');
    const addResult = await db.toggleWishlist(userId, productId);
    console.log('   Result:', addResult);

    console.log('2. Fetching wishlist...');
    const wishlist = await db.getWishlist(userId);
    console.log('   Wishlist:', wishlist);

    if (!wishlist.includes(productId)) {
      throw new Error('Product not found in wishlist after add');
    }

    console.log('3. Toggling wishlist (Remove)...');
    const removeResult = await db.toggleWishlist(userId, productId);
    console.log('   Result:', removeResult);

    console.log('4. Fetching wishlist...');
    const finalWishlist = await db.getWishlist(userId);
    console.log('   Final Wishlist:', finalWishlist);

    if (finalWishlist.includes(productId)) {
      throw new Error('Product still in wishlist after remove');
    }

    console.log('✅ Wishlist Diagnostics Passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Wishlist Diagnostics Failed:', err.message);
    process.exit(1);
  }
}

runTest();
