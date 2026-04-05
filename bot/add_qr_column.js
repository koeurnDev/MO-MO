const { pool } = require('./db');
pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS qr_string TEXT;')
  .then(() => {
    console.log('SUCCESS: Column qr_string added to orders table.');
    process.exit(0);
  })
  .catch(err => {
    console.error('ERROR: Failed to add column.', err);
    process.exit(1);
  });
