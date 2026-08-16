require('dotenv').config({path: './.env'});
const db = require('./config/database');
db.query("UPDATE settings SET value = 'MARUN MINI STORE' WHERE key IN ('receipt_shop_name', 'bakong_merchant_name')")
  .then(() => {
    console.log('Update done');
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
