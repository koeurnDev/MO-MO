const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon in some environments
  }
});

/**
 * Initialize tables in PostgreSQL
 */
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT NOT NULL,
        image TEXT
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        user_name TEXT,
        items TEXT,
        total REAL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        phone TEXT,
        address TEXT,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INT DEFAULT 10;
    `);
    
    // Seed database with initial products if empty
    const res = await client.query('SELECT count(*) FROM products');
    if (parseInt(res.rows[0].count) === 0) {
      const initialProducts = [
        ['Replica Jazz Club', 125, 'perfume', 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=200', 10],
        ['Replica Beach Walk', 135, 'perfume', 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=200', 10],
        ['Bonsai Powder', 45, 'powder', 'https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?auto=format&fit=crop&q=80&w=200', 15],
        ['Silky Rose Powder', 38, 'powder', 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=200', 20],
        ['Summer Clothing Set', 65, 'clothing', 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=200', 5],
        ['Limited Edition Promo', 99, 'promo', 'https://images.unsplash.com/photo-1605246811037-7a815fa646e4?auto=format&fit=crop&q=80&w=200', 5]
      ];

      for (const p of initialProducts) {
        await client.query('INSERT INTO products (name, price, category, image, stock) VALUES ($1, $2, $3, $4, $5)', p);
      }
      console.log('Neon Database seeded with initial products.');
    }
  } catch (err) {
    console.error('Database Initialization Failed:', err);
  } finally {
    client.release();
  }
}

// Automatically initialize on load
initDB();

module.exports = {
  getProducts: async () => {
    const res = await pool.query('SELECT * FROM products ORDER BY id ASC');
    return res.rows;
  },
  createOrder: async (order) => {
    const res = await pool.query(
      'INSERT INTO orders (user_id, user_name, items, total) VALUES ($1, $2, $3, $4) RETURNING id',
      [order.userId, order.userName, JSON.stringify(order.items), order.total]
    );
    return res.rows[0];
  },
  getOrders: async () => {
    const res = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    return res.rows;
  },
  updateOrderStatus: async (id, status) => {
    const res = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return res.rows[0];
  },
  addProduct: async (p) => {
    const stockVal = p.stock !== undefined ? parseInt(p.stock) : 10;
    const res = await pool.query(
      'INSERT INTO products (name, price, category, image, stock) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [p.name, p.price, p.category, p.image, stockVal]
    );
    return res.rows[0];
  },
  updateProduct: async (id, p) => {
    const stockVal = p.stock !== undefined ? parseInt(p.stock) : 10;
    const res = await pool.query(
      'UPDATE products SET name = $1, price = $2, category = $3, image = $4, stock = $5 WHERE id = $6 RETURNING *',
      [p.name, p.price, p.category, p.image, stockVal, id]
    );
    return res.rows[0];
  },
  deductStock: async (id, qty) => {
    const res = await pool.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING *',
      [qty, id]
    );
    return res.rows[0];
  },
  deleteProduct: async (id) => {
    const res = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    return res.rows[0];
  },
  getUser: async (id) => {
    const res = await pool.query('SELECT * FROM users WHERE user_id = $1', [id]);
    return res.rows[0];
  },
  upsertUser: async (id, phone, address) => {
    const res = await pool.query(
      `INSERT INTO users (user_id, phone, address, last_updated) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET phone = $2, address = $3, last_updated = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, phone, address]
    );
    return res.rows[0];
  }
};
