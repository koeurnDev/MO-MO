const { Pool } = require('pg');
const { encrypt, decrypt } = require('./utils/crypto');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost')) ? false : {
    rejectUnauthorized: false
  }
});

/**
 * Initialize tables in PostgreSQL
 */
async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing in environment variables.');
    return;
  }
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT NOT NULL,
        image TEXT,
        stock INT DEFAULT 10
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        user_name TEXT,
        items TEXT,
        total REAL,
        status TEXT DEFAULT 'pending',
        qr_string TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        phone TEXT,
        address TEXT,
        loyalty_points REAL DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        discount_type TEXT NOT NULL, -- 'fixed' or 'percent'
        value REAL NOT NULL,
        active BOOLEAN DEFAULT true,
        is_auto BOOLEAN DEFAULT false,
        apply_to TEXT DEFAULT 'all', -- 'all' or 'specific'
        start_date TIMESTAMP,
        end_date TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS coupon_products (
        coupon_id INT REFERENCES coupons(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        PRIMARY KEY (coupon_id, product_id)
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );

      INSERT INTO settings (key, value) VALUES ('shop_status', 'open') ON CONFLICT DO NOTHING;
      INSERT INTO settings (key, value) VALUES ('delivery_threshold', '50') ON CONFLICT DO NOTHING;
      INSERT INTO settings (key, value) VALUES ('delivery_fee', '1.50') ON CONFLICT DO NOTHING;
      INSERT INTO settings (key, value) VALUES ('promo_text', '🚚 ដឹកជញ្ជូនឥតគិតថ្លៃលើរាល់ការកម្ម៉ង់!') ON CONFLICT DO NOTHING;
      INSERT INTO settings (key, value) VALUES ('payment_qr_url', '') ON CONFLICT DO NOTHING;
      INSERT INTO settings (key, value) VALUES ('payment_info', 'ABA: 000 000 000 (MO MO)') ON CONFLICT DO NOTHING;
      INSERT INTO settings (key, value) VALUES ('bakong_account_id', 'koeurn_seab@wing') ON CONFLICT DO NOTHING;
      INSERT INTO settings (key, value) VALUES ('bakong_merchant_name', 'MO MO Boutique') ON CONFLICT DO NOTHING;
      INSERT INTO settings (key, value) VALUES ('bakong_api_url', '') ON CONFLICT DO NOTHING;
      INSERT INTO settings (key, value) VALUES ('bakong_api_token', '') ON CONFLICT DO NOTHING;
      INSERT INTO settings (key, value) VALUES ('bakong_auto_confirm', 'false') ON CONFLICT DO NOTHING;

      -- Seed default categories if none exist
      INSERT INTO categories (name) 
      SELECT UNNEST(ARRAY['ទឹកអប់ (Perfume)', 'ឡេ (Lotion)', 'ស្ព្រៃយ៍ (Bodyspray)'])
      WHERE NOT EXISTS (SELECT 1 FROM categories);
    `);
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Database Initialization Failed:', err);
  } finally {
    client.release();
  }
}

initDB().catch(err => console.error('Error during initDB call:', err));

module.exports = {
  pool,
  getProducts: async () => {
    const res = await pool.query('SELECT * FROM products ORDER BY id ASC');
    return res.rows;
  },
  createOrder: async (order) => {
    const res = await pool.query(
      'INSERT INTO orders (user_id, user_name, items, total, qr_string) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [order.userId, order.userName, JSON.stringify(order.items), order.total, order.qrString]
    );
    return res.rows[0];
  },
  getOrderById: async (id) => {
    const res = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    return res.rows[0];
  },
  getOrders: async () => {
    const res = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    return res.rows;
  },
  updateOrderStatus: async (id, status) => {
    const res = await pool.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    return res.rows[0];
  },
  addProduct: async (p) => {
    const res = await pool.query(
      'INSERT INTO products (name, price, category, image, stock) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [p.name, p.price, p.category, p.image, p.stock || 10]
    );
    return res.rows[0];
  },
  updateProduct: async (id, p) => {
    const res = await pool.query(
      'UPDATE products SET name = $1, price = $2, category = $3, image = $4, stock = $5 WHERE id = $6 RETURNING *',
      [p.name, p.price, p.category, p.image, p.stock, id]
    );
    return res.rows[0];
  },
  deductStock: async (id, qty) => {
    const res = await pool.query('UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING *', [qty, id]);
    return res.rows[0];
  },
  deleteProduct: async (id) => {
    const res = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    return res.rows[0];
  },
  getUser: async (id) => {
    const res = await pool.query('SELECT * FROM users WHERE user_id = $1', [id]);
    const user = res.rows[0];
    if (user) {
      user.phone = decrypt(user.phone);
      user.address = decrypt(user.address);
    }
    return user;
  },
  upsertUser: async (id, phone, address) => {
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
      'UPDATE users SET loyalty_points = loyalty_points + $1 WHERE user_id = $2 RETURNING *',
      [points, userId]
    );
    return res.rows[0];
  },
  // --- Overhaul Queries ---
  getAnalytics: async () => {
    const daily = await pool.query(`
      SELECT TO_CHAR(created_at, 'Mon DD') as date, SUM(total) as revenue, COUNT(*) as count 
      FROM orders 
      WHERE created_at > CURRENT_DATE - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'Mon DD'), created_at
      ORDER BY created_at ASC
    `);
    const status = await pool.query(`SELECT status, COUNT(*) as count FROM orders GROUP BY status`);
    return { daily: daily.rows, status: status.rows };
  },
  getCustomers: async () => {
    const res = await pool.query(`
      SELECT u.*, COUNT(o.id) as order_count, SUM(o.total) as ltv
      FROM users u
      LEFT JOIN orders o ON u.user_id = o.user_id
      GROUP BY u.user_id
      ORDER BY ltv DESC
    `);
    const customers = res.rows.map(u => ({
      ...u,
      phone: decrypt(u.phone),
      address: decrypt(u.address)
    }));
    return customers;
  },
  getOrdersByUser: async (userId) => {
    const res = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return res.rows;
  },
  getCoupons: async () => {
    const res = await pool.query(`
      SELECT c.*, array_agg(cp.product_id) FILTER (WHERE cp.product_id IS NOT NULL) as product_ids
      FROM coupons c
      LEFT JOIN coupon_products cp ON c.id = cp.coupon_id
      GROUP BY c.id
      ORDER BY c.id DESC
    `);
    return res.rows;
  },
  addCoupon: async (c) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const sDate = (c.startDate && c.startDate.trim() !== '') ? c.startDate : null;
      const eDate = (c.endDate && c.endDate.trim() !== '') ? c.endDate : null;

      const res = await client.query(
        'INSERT INTO coupons (code, discount_type, value, is_auto, apply_to, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [c.code.toUpperCase(), c.type, c.value, c.isAuto || false, c.applyTo || 'all', sDate, eDate]
      );
      const coupon = res.rows[0];
      if (c.applyTo === 'specific' && c.productIds && c.productIds.length > 0) {
        for (const pid of c.productIds) {
          await client.query('INSERT INTO coupon_products (coupon_id, product_id) VALUES ($1, $2)', [coupon.id, pid]);
        }
      }
      await client.query('COMMIT');
      return coupon;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
  deleteCoupon: async (id) => {
    await pool.query('DELETE FROM coupons WHERE id = $1', [id]);
  },
  getActiveAutoDiscounts: async () => {
    const res = await pool.query(`
      SELECT c.*, array_agg(cp.product_id) FILTER (WHERE cp.product_id IS NOT NULL) as product_ids
      FROM coupons c
      LEFT JOIN coupon_products cp ON c.id = cp.coupon_id
      WHERE c.is_auto = true AND c.active = true 
      AND (c.start_date IS NULL OR c.start_date <= CURRENT_TIMESTAMP)
      AND (c.end_date IS NULL OR c.end_date >= CURRENT_TIMESTAMP)
      GROUP BY c.id
    `);
    return res.rows;
  },
  getSetting: async (key) => {
    const res = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    return res.rows[0]?.value;
  },
  updateSetting: async (key, value) => {
    await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, value]);
  },
  // --- Category Queries ---
  getCategories: async () => {
    const res = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    return res.rows;
  },
  addCategory: async (name) => {
    const res = await pool.query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *', [name]);
    return res.rows[0];
  },
  deleteCategory: async (id) => {
    // Before deleting, reset products in this category (optional but safer)
    await pool.query('UPDATE products SET category = $1 WHERE category = (SELECT name FROM categories WHERE id = $2)', ['Uncategorized', id]);
    const res = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    return res.rows[0];
  }
};
