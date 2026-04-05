require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cloudinary = require('cloudinary').v2;
const bot = require('./bot');

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
})); 
app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [process.env.WEBAPP_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'];
    if (!origin || allowed.some(url => url && origin.startsWith(url))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-TG-Data', 'Authorization']
}));

// Route Imports
const adminRoutes = require('./routes/admin');
const orderRoutes = require('./routes/orders');
const publicRoutes = require('./routes/public');

// Inject Bot into routes that need it for notifications
adminRoutes.setBot(bot);
orderRoutes.setBot(bot);

// Routes
app.get('/', (req, res) => res.send('MO-MO Boutique API Online! ✨'));
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', publicRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ CRITICAL SERVER ERROR:', err.stack || err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal Server Error', 
    details: err.message 
  });
});

const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

app.listen(PORT, async () => {
  console.log(`🚀 MO-MO Server listening on port ${PORT}`);
  
  if (process.env.WEBAPP_URL && process.env.WEBAPP_URL.startsWith('https')) {
    bot.telegram.setChatMenuButton({ 
      type: 'web_app', 
      text: 'Shop Now', 
      web_app: { url: process.env.WEBAPP_URL } 
    }).catch(e => console.error('Menu button failed:', e.message));
  }

  if (WEBHOOK_URL) {
    app.use(bot.webhookCallback('/telegraf'));
    await bot.telegram.setWebhook(`${WEBHOOK_URL}/telegraf`);
    console.log('Bot set to Webhook mode');
  } else { 
    bot.launch()
      .then(() => console.log('Bot launched via Polling'))
      .catch(err => console.error('Bot launch failed:', err)); 
  }
});
