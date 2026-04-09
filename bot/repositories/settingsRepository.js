const pool = require('../config/database');
const cacheService = require('../services/cacheService');

const CACHE_TTL = {
  settings: 600,        // 10 minutes
  categories: 600,      // 10 minutes
};

const CACHE_KEYS = {
  allSettings: 'settings:all',
  categories: 'settings:categories'
};

const settingsRepository = {
  get: async (key) => {
    return await cacheService.getOrFetch(
      `settings:val:${key}`,
      async () => {
        const res = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
        return res.rows[0]?.value;
      },
      CACHE_TTL.settings
    );
  },

  getAll: async () => {
    return await cacheService.getOrFetch(
      CACHE_KEYS.allSettings,
      async () => {
        const res = await pool.query('SELECT * FROM settings');
        const settings = {};
        res.rows.forEach(row => {
          settings[row.key] = row.value;
        });
        return settings;
      },
      CACHE_TTL.settings
    );
  },

  getByKeys: async (keys) => {
    return await cacheService.getOrFetch(
      `${CACHE_KEYS.allSettings}:${keys.sort().join(',')}`,
      async () => {
        const res = await pool.query('SELECT key, value FROM settings WHERE key = ANY($1)', [keys]);
        const settings = {};
        res.rows.forEach(row => {
          settings[row.key] = row.value;
        });
        return settings;
      },
      CACHE_TTL.settings
    );
  },

  update: async (key, value) => {
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, value]
    );
    // 🚀 Invalidate cache on update
    await cacheService.clearPattern('settings:*');
  },

  // --- Category Queries ---
  getCategories: async () => {
    return await cacheService.getOrFetch(
      CACHE_KEYS.categories,
      async () => {
        const res = await pool.query('SELECT * FROM categories ORDER BY id ASC');
        return res.rows;
      },
      CACHE_TTL.categories
    );
  },

  addCategory: async (name) => {
    const res = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *',
      [name]
    );
    // 🚀 Invalidate cache on add
    await cacheService.delete(CACHE_KEYS.categories);
    return res.rows[0];
  },

  deleteCategory: async (id) => {
    const res = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    // 🚀 Invalidate cache on delete
    await cacheService.delete(CACHE_KEYS.categories);
    return res.rows[0];
  },

  updateProductCategory: async (oldCategory, newCategory) => {
    await pool.query('UPDATE products SET category = $1 WHERE category = $2', [newCategory, oldCategory]);
  }
};

module.exports = settingsRepository;
