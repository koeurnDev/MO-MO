const { pool } = require('./db');
pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'orders\'')
  .then(res => {
    console.log('COLUMNS_FINAL:', res.rows.map(r => r.column_name));
    process.exit(0);
  })
  .catch(err => {
    console.error('VERIFY_ERROR:', err);
    process.exit(1);
  });
