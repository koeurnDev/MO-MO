const pool = require('../config/database');

const broadcastRepository = {
  initTable: async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS broadcasts (
          id SERIAL PRIMARY KEY,
          message TEXT,
          photo_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (e) {
      console.warn('⚠️ [BroadcastRepo] Table init warn:', e.message);
    }
  },

  getAll: async (limit = 20) => {
    try {
      await broadcastRepository.initTable();
      const res = await pool.query(
        'SELECT id, message, photo_url, created_at FROM broadcasts ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
      if (res.rows.length === 0) {
        return [{
          id: 'welcome-system-notice',
          message: '🎉 ស្វាគមន៍មកកាន់ MARUN MINI STORE! 🛍️✨\nសូមរីករាយជាមួយការទិញទំនិញសម្លៀកបំពាក់ និងផលិតផលសម្រស់គុណភាពខ្ពស់ ជាមួយសេវាកម្មដឹកជញ្ជូនរហ័សទូទាំងប្រទេស! 🚚',
          photo_url: '',
          created_at: new Date().toISOString()
        }];
      }
      return res.rows;
    } catch (e) {
      console.error('❌ [BroadcastRepo] getAll error:', e.message);
      return [{
        id: 'welcome-system-notice',
        message: '🎉 ស្វាគមន៍មកកាន់ MO MO BOUTIQUE! 🛍️✨\nសូមរីករាយជាមួយការទិញទំនិញសម្លៀកបំពាក់ និងផលិតផលសម្រស់គុណភាពខ្ពស់ ជាមួយសេវាកម្មដឹកជញ្ជូនរហ័សទូទាំងប្រទេស! 🚚',
        photo_url: '',
        created_at: new Date().toISOString()
      }];
    }
  },

  create: async (message, photoUrl) => {
    try {
      await broadcastRepository.initTable();
      const res = await pool.query(
        'INSERT INTO broadcasts (message, photo_url) VALUES ($1, $2) RETURNING *',
        [message || '', photoUrl || '']
      );
      return res.rows[0];
    } catch (e) {
      console.error('❌ [BroadcastRepo] create error:', e.message);
      return null;
    }
  },

  delete: async (id) => {
    try {
      await broadcastRepository.initTable();
      await pool.query('DELETE FROM broadcasts WHERE id = $1', [id]);
      return true;
    } catch (e) {
      console.error('❌ [BroadcastRepo] delete error:', e.message);
      return false;
    }
  }
};

module.exports = broadcastRepository;
