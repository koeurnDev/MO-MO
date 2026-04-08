const pool = require('../config/database');
const { encrypt, decrypt } = require('../utils/crypto');

const userRepository = {
  findById: async (id) => {
    const res = await pool.query('SELECT * FROM users WHERE user_id = $1', [id]);
    const user = res.rows[0];
    if (user) {
      user.phone = decrypt(user.phone);
      user.address = decrypt(user.address);
    }
    return user;
  },

  findAll: async () => {
    const res = await pool.query('SELECT * FROM users ORDER BY last_updated DESC');
    return res.rows;
  },

  getAllIds: async () => {
    const res = await pool.query('SELECT user_id FROM users');
    return res.rows.map(r => r.user_id);
  },

  upsert: async (id, phone, address) => {
    const encPhone = encrypt(phone);
    const encAddress = encrypt(address);
    const res = await pool.query(
      `INSERT INTO users (user_id, phone, address, last_updated, loyalty_points) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 0)
       ON CONFLICT (user_id) DO UPDATE SET phone = $2, address = $3, last_updated = CURRENT_TIMESTAMP RETURNING *`,
      [id, encPhone, encAddress]
    );
    const user = res.rows[0];
    if (user) {
      user.phone = decrypt(user.phone);
      user.address = decrypt(user.address);
    }
    return user;
  },

  addLoyaltyPoints: async (userId, points) => {
    const res = await pool.query(
      'UPDATE users SET loyalty_points = loyalty_points + $1, last_updated = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING *',
      [points, userId]
    );
    return res.rows[0];
  },

  getCount: async () => {
    const res = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(res.rows[0]?.count || 0);
  }
};

module.exports = userRepository;
