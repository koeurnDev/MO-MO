require('dotenv').config({path: __dirname + '/../.env'});
const db = require('../config/database');
db.query("UPDATE users SET role = 'admin' WHERE user_id = '1778277124' RETURNING *")
  .then(res => { 
      console.log("Updated user:", res.rows); 
      process.exit(0); 
  })
  .catch(err => {
      console.error(err);
      process.exit(1);
  });
