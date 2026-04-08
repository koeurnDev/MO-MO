const pool = require('../config/database');

const settingsRepository = {
  get: async (key) => {
    const res = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    return res.rows[0]?.value;
  },

  getAll: async () => {
    const res = await pool.query('SELECT * FROM settings');
    const settings = {};
    res.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  },

  getByKeys: async (keys) => {
    const res = await pool.query('SELECT key, value FROM settings WHERE key = ANY($1)', [keys]);
    const settings = {};
    res.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  },

  update: async (key, value) => {
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, value]
    );
  },

  // --- Category Queries ---
  getCategories: async () => {
    const res = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    return res.rows;
  },

  addCategory: async (name) => {
    const res = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *',
      [name]
    );
    return res.rows[0];
  },

  deleteCategory: async (id) => {
    const res = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    return res.rows[0];
  },

  updateProductCategory: async (oldCategory, newCategory) => {
    await pool.query('UPDATE products SET category = $1 WHERE category = $2', [newCategory, oldCategory]);
  }
};

module.exports = settingsRepository;
