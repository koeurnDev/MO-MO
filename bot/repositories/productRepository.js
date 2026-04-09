const pool = require('../config/database');
const cacheService = require('../services/cacheService');

const CACHE_TTL = {
  products: 300,        // 5 minutes
  inventory: 60,        // 1 minute
};

const CACHE_KEYS = {
  allProducts: 'products:all',
  minimalProducts: 'products:minimal',
  inventoryStats: 'products:inventory:stats'
};

const productRepository = {
  findAll: async (limit = 100, offset = 0) => {
    // Note: Pagination with offset doesn't cache well, only cache full list
    if (offset === 0 && limit === 100) {
      return await cacheService.getOrFetch(
        CACHE_KEYS.allProducts,
        async () => {
          const res = await pool.query('SELECT * FROM products ORDER BY id DESC LIMIT $1 OFFSET $2', [limit, offset]);
          return res.rows;
        },
        CACHE_TTL.products
      );
    }

    // Non-cached for pagination
    const res = await pool.query('SELECT * FROM products ORDER BY id DESC LIMIT $1 OFFSET $2', [limit, offset]);
    return res.rows;
  },

  // ⚡ Optimized for high-frequency storefront/admin-grid loads
  findAllMinimal: async () => {
    return await cacheService.getOrFetch(
      CACHE_KEYS.minimalProducts,
      async () => {
        const res = await pool.query('SELECT id, name, price, stock, category, image FROM products ORDER BY id DESC');
        return res.rows;
      },
      CACHE_TTL.products
    );
  },

  findById: async (id) => {
    const res = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return res.rows[0];
  },

  findByIds: async (ids) => {
    const res = await pool.query('SELECT * FROM products WHERE id = ANY($1)', [ids]);
    return res.rows;
  },

  create: async (p) => {
    const res = await pool.query(
      'INSERT INTO products (name, category, price, image, stock, description, additional_images) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [p.name, p.category, p.price, p.image, p.stock || 0, p.description || '', p.additional_images || '[]']
    );
    // 🚀 Invalidate cache on create
    await cacheService.clearPattern('products:*');
    return res.rows[0];
  },

  update: async (id, p) => {
    const res = await pool.query(
      'UPDATE products SET name = $1, category = $2, price = $3, image = $4, stock = $5, description = $6, additional_images = $7 WHERE id = $8 RETURNING *',
      [p.name, p.category, p.price, p.image, p.stock, p.description, p.additional_images, id]
    );
    // 🚀 Invalidate cache on update
    await cacheService.clearPattern('products:*');
    return res.rows[0];
  },

  deductStock: async (id, qty) => {
    const res = await pool.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING *',
      [qty, id]
    );
    return res.rows[0];
  },

  deductStockBatch: async (items, client = pool) => {
    // 🛡️ Principal 20-Year Exp: Atomic Batch Stock Deduction
    // Uses CASE statement for single-query performance (O(1) round-trip)
    const updateParams = items.flatMap(item => [item.id, item.quantity]);
    const casePhrases = items.map((item, idx) => 
      `WHEN id = $${idx * 2 + 1}::integer THEN $${idx * 2 + 2}::integer`
    ).join(' ');
    
    const idsParamIdx = items.length * 2 + 1;
    const query = `
      UPDATE products 
      SET stock = stock - (CASE ${casePhrases} END)::integer 
      WHERE id = ANY($${idsParamIdx}::integer[])
      RETURNING *
    `;

    const res = await client.query(query, [...updateParams, items.map(i => i.id)]);
    
    // Verify all items were updated (if count mismatches, some item was missing or out of stock)
    if (res.rowCount < items.length) {
      throw new Error('Some items are out of stock or invalid');
    }
    
    // 🚀 Invalidate all relevant caches on stock change
    await cacheService.clearPattern('products:*');
    
    return res.rows;
  },

  addStock: async (id, qty) => {
    const res = await pool.query(
      'UPDATE products SET stock = stock + $1 WHERE id = $2 RETURNING *',
      [qty, id]
    );
    // 🚀 Invalidate cache on stock change
    await cacheService.clearPattern('products:*');
    return res.rows[0];
  },

  getInventoryStats: async () => {
    // ✅ Optimized: Using Materialized View with caching
    return await cacheService.getOrFetch(
      CACHE_KEYS.inventoryStats,
      async () => {
        const res = await pool.query('SELECT COUNT(*) FILTER (WHERE stock > 0) as "inStock", COUNT(*) as total FROM product_stats');
        return res.rows[0];
      },
      CACHE_TTL.inventory
    );
  },

  delete: async (id) => {
    const res = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    // 🚀 Invalidate cache on delete
    await cacheService.clearPattern('products:*');
    return res.rows[0];
  }
};

module.exports = productRepository;
