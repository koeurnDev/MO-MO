const pool = require('../config/database');

const orderRepository = {
  create: async (o, client = pool) => {
    const res = await client.query(
      `INSERT INTO orders 
       (user_id, user_name, items, total, qr_string, phone, address, province, note, delivery_company, payment_method, order_code, idempotency_key, expires_at, status, subtotal, discount_amount, delivery_fee, gross_total) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
      [
        o.user_id, o.user_name, o.items, o.total, o.qr_string || '', 
        o.phone, o.address, o.province, o.note, o.delivery_company, 
        o.payment_method, o.order_code, o.idempotency_key, o.expires_at || null,
        'pending', o.subtotal || 0, o.discount_amount || 0, o.delivery_fee || 0, o.gross_total || 0
      ]
    );
    return res.rows[0];
  },

  findByCode: async (code) => {
    const res = await pool.query('SELECT * FROM orders WHERE order_code = $1', [code]);
    return res.rows[0];
  },

  findById: async (id) => {
    const res = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    return res.rows[0];
  },

  findByIdempotencyKey: async (userId, key) => {
    const res = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 AND idempotency_key = $2',
      [userId, key]
    );
    return res.rows[0];
  },

  findRecentDuplicate: async (userId, total, itemsJson) => {
    const res = await pool.query(
      `SELECT * FROM orders 
       WHERE user_id = $1 AND total = $2 AND items = $3 AND created_at > NOW() - INTERVAL '30 seconds' 
       ORDER BY created_at DESC LIMIT 1`,
      [userId, total, itemsJson]
    );
    return res.rows[0];
  },

  findByUserPaginated: async (userId, limit = 50, offset = 0) => {
    const res = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return res.rows;
  },

  countByUser: async (userId) => {
    const res = await pool.query('SELECT COUNT(*) as total FROM orders WHERE user_id = $1', [userId]);
    return parseInt(res.rows[0]?.total || 0);
  },

  findAll: async (limit = 100, offset = 0) => {
    const res = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    return res.rows;
  },

  updateStatus: async (id, status, trackingNumber = null, client = pool) => {
    const res = await client.query(
      "UPDATE orders SET status = $1, tracking_number = $2 WHERE id = $3 RETURNING *",
      [status, trackingNumber, id]
    );
    return res.rows[0];
  },

  updateQrString: async (id, qr) => {
    await pool.query('UPDATE orders SET qr_string = $1 WHERE id = $2', [qr, id]);
  },

  updateExpiry: async (id, expiresAt) => {
    const res = await pool.query(
      'UPDATE orders SET expires_at = $1, status = $2 WHERE id = $3 RETURNING *',
      [expiresAt, 'pending', id]
    );
    return res.rows[0];
  },

  getRevenueSummary: async () => {
    const res = await pool.query("SELECT SUM(total) as total FROM orders WHERE status != 'cancelled'");
    return parseFloat(res.rows[0]?.total || 0);
  },

  getTotalCount: async () => {
    const res = await pool.query('SELECT COUNT(*) as count FROM orders');
    return parseInt(res.rows[0]?.count || 0);
  },

  getActiveCount: async () => {
    const res = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'processing', 'shipped')");
    return parseInt(res.rows[0]?.count || 0);
  },

  getHealthStats: async () => {
    const res = await pool.query("SELECT COUNT(*) FILTER (WHERE status IN ('paid', 'processing', 'shipped', 'delivering', 'delivered')) as healthy, COUNT(*) as total FROM orders");
    return res.rows[0];
  },

  getDailyStats: async (days = 14) => {
    const res = await pool.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, SUM(total) as revenue, COUNT(*) as orders
      FROM orders
      WHERE created_at > CURRENT_DATE - INTERVAL '${days} days' AND status != 'cancelled'
      GROUP BY date
      ORDER BY date ASC
    `);
    return res.rows;
  },

  getStatusDistribution: async () => {
    const res = await pool.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status');
    return res.rows;
  },

  findPendingOrders: async (lookbackHours = 24) => {
    const res = await pool.query(
      `SELECT * FROM orders 
       WHERE status = 'pending' 
       AND created_at > NOW() - (INTERVAL '1 hour' * $1)
       ORDER BY created_at ASC`,
      [lookbackHours]
    );
    return res.rows;
  }
};

module.exports = orderRepository;
