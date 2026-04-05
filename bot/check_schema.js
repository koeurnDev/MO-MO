const { pool } = require('./db');
pool.query("SELECT * FROM orders LIMIT 0")
  .then(res => {
    console.log('COLUMNS:', res.fields.map(f => f.name));
    process.exit(0);
  })
  .catch(err => {
    console.error('SCHEMA_CHECK_ERROR:', err);
    process.exit(1);
  });
