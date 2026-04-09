const { Pool } = require('pg');
require('dotenv').config();

async function testPool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20
  });

  console.log('🧪 Starting Pool Connection Test (Max 20)...');
  const connections = [];
  
  try {
    for (let i = 1; i <= 20; i++) {
      process.stdout.write(`Attempting connection ${i}... `);
      const startTime = Date.now();
      const client = await pool.connect();
      connections.push(client);
      console.log(`✅ Success in ${Date.now() - startTime}ms`);
    }
    console.log('\n🌟 All 20 connections established successfully!');
  } catch (err) {
    console.error('\n❌ Pool test failed at connection ' + (connections.length + 1) + ':', err.message);
  } finally {
    console.log('🧹 Cleaning up connections...');
    for (const client of connections) {
      client.release();
    }
    await pool.end();
    console.log('✅ Pool test finished.');
  }
}

testPool();
