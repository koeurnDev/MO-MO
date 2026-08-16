require('dotenv').config({path: './.env'});
const db = require('./config/database');
db.query("SELECT value FROM settings WHERE key = 'shop_logo_url'")
  .then((res) => {
    console.log(res.rows);
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
