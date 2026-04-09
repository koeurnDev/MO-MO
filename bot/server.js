require('dotenv').config();
const app = require('./app');
const pool = require('./config/database');
const { connectRedis } = require('./config/redis');
const bot = require('./config/telegram');
const paymentReconciler = require('./workers/paymentReconciler');

// Error Handling (Global)
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION:', reason);
  process.exit(1);
});

const validateEnv = () => {
  const required = [
    'BOT_TOKEN', 'DATABASE_URL', 
    'WEBAPP_URL', 'SUPERADMIN_ID',
    'SESSION_SECRET'
  ];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error('🔴 CRITICAL: Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
  
  if (process.env.SESSION_SECRET?.length < 32) {
    console.warn('⚠️ WARNING: SESSION_SECRET is too short (< 32 chars). Increased risk of brute force.');
  }
};

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    validateEnv();
    // 1. Initial Database Connection Check with Exponential Backoff
    console.log('⏳ Connecting to Database...');
    let client;
    let retries = 3;
    let delay = 1000; // Start with 1s

    while (retries > 0) {
      try {
        client = await pool.connect();
        console.log('✅ DB Connected Successfully');
        client.release();
        break;
      } catch (err) {
        retries--;
        console.warn(`⚠️ DB Connection attempt failed (${err.message}). Retries left: ${retries}`);
        if (retries === 0) throw err;
        
        console.log(`🕒 Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff: 1s, 2s, 4s
      }
    }

    // 2. Redis Connection (Async/Non-blocking)
    console.log('⏳ Connecting to Redis...');
    connectRedis(); // No await here

    // 3. Telegram Bot Start (🛡️ Hardened: Non-blocking launch)
    console.log('⏳ Launching Telegram Bot...');
    bot.launch()
      .then(() => console.log('🤖 Bot: Launched'))
      .catch(botErr => {
        console.error('⚠️ Bot Launch Warning:', botErr.message);
        console.log('ℹ️ Server is running for Webapp API despite Bot conflict.');
      });

    // 4. Express Start
    console.log('⏳ Starting Express Server...');
    app.listen(PORT, () => {
      console.log(`🚀 Server: Running on port ${PORT}`);
      
      // 5. 🛡️ Payment Resilience: Start Background Reconciler
      paymentReconciler.start();
    });
  } catch (err) {
    console.error('🔴 Server Start Fail:', err.message);
    process.exit(1);
  }
};

startServer();
