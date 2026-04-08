const pool = require('../config/database');

const wishlistRepository = {
  findByUserId: async (userId) => {
    const res = await pool.query('SELECT product_id FROM wishlist WHERE user_id = $1', [userId]);
    return res.rows.map(r => r.product_id);
  },

  exists: async (userId, productId) => {
    const res = await pool.query('SELECT 1 FROM wishlist WHERE user_id = $1 AND product_id = $2', [userId, productId]);
    return res.rows.length > 0;
  },

  add: async (userId, productId) => {
    await pool.query('INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, productId]);
  },

  remove: async (userId, productId) => {
    await pool.query('DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2', [userId, productId]);
  }
};

module.exports = wishlistRepository;
