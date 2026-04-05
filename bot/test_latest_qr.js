const { pool } = require('./db');
pool.query('SELECT id, qr_string FROM orders ORDER BY id DESC LIMIT 1')
  .then(res => {
    console.log('LATEST_ORDER:', JSON.stringify(res.rows[0]));
    process.exit(0);
  })
  .catch(err => {
    console.error('DB_ERROR:', err);
    process.exit(1);
  });
