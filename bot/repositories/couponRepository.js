const pool = require('../config/database');

const couponRepository = {
  findAll: async () => {
    const res = await pool.query(`
      SELECT c.*, array_agg(cp.product_id) FILTER (WHERE cp.product_id IS NOT NULL) as product_ids
      FROM coupons c
      LEFT JOIN coupon_products cp ON c.id = cp.coupon_id
      GROUP BY c.id
      ORDER BY c.id DESC
    `);
    return res.rows;
  },

  findActiveAuto: async () => {
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

  create: async (c) => {
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

  delete: async (id) => {
    await pool.query('DELETE FROM coupons WHERE id = $1', [id]);
  }
};

module.exports = couponRepository;
