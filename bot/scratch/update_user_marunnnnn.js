require('dotenv').config({path: __dirname + '/../.env'});
const db = require('../config/database');
db.query("UPDATE users SET role = 'admin' WHERE username = 'marunnnnn' OR username = '@marunnnnn' OR user_id = '1778277124' RETURNING *")
  .then(res => { 
      console.log("Updated user(s):", res.rows); 
      process.exit(0); 
  })
  .catch(err => {
      console.error(err);
      process.exit(1);
  });
