const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { observabilityLogger, telemetryHandler } = require('./middleware/observability');
const { globalLimiter } = require('./middleware/rateLimiter');
const { verifyUser, isAdmin } = require('./middleware/auth');
const validator = require('./middleware/validator');
const chaosMiddleware = require('./middleware/chaosMiddleware');

// Controller Imports
const publicController = require('./controllers/publicController');
const orderController = require('./controllers/orderController');
const adminController = require('./controllers/adminController');
const wishlistController = require('./controllers/wishlistController');
const systemRoutes = require('./routes/systemRoutes');

// Middleware Config
const { orderCreationLimiter } = require('./middleware/rateLimiter');
const multer = require('multer');
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 🛡 Limit to 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed'));
  }
});

const app = express();
app.set('trust proxy', 1);

// --- Standard Middleware ---
app.use(compression({
  level: 9,
  threshold: 512,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org", "https://*.telegram.org"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://images.unsplash.com", "https://*.telegram.org"],
      connectSrc: ["'self'", "https://*.telegram.org", process.env.VITE_BACKEND_URL || "https://tg-mini-app-bot.onrender.com", "http://localhost:3005"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'", "https://t.me", "https://web.telegram.org"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

app.use(express.json());
app.use(observabilityLogger);
app.use(cors({
  origin: (origin, callback) => {
    // 🛡️ Strict CORS: localhost only for dev, WEBAPP_URL for production
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    const allowed = [process.env.WEBAPP_URL];
    if (isDev) {
      allowed.push('http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000');
    }
    
    if (!origin || allowed.filter(Boolean).includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-TG-Data', 'Authorization']
}));

// --- Routes ---
app.get('/', (req, res) => res.send('MO-MO Boutique API Online! ✨'));
app.get('/api/alive', (req, res) => res.json({ success: true, timestamp: new Date() }));
app.post('/api/telemetry', telemetryHandler);

app.use('/api', chaosMiddleware);
app.use('/api', globalLimiter);
app.use('/api', systemRoutes);

// ✅ Performance: Stale-While-Revalidate Caching for Products
app.get('/api/products', (req, res, next) => {
  res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  next();
});

// Bootstrap & Public Routes
app.post('/api/bootstrap', publicController.bootstrap);
app.get('/api/init', publicController.getInitData);
app.get('/api/settings', publicController.getSettings);
app.get('/api/products', publicController.getProducts);

// Order Routes
app.post('/api/orders', orderCreationLimiter, verifyUser, validator.order, orderController.createOrder);
app.post('/api/orders/confirm', verifyUser, orderController.confirmOrder);
app.get('/api/orders/status/:orderCode', verifyUser, orderController.getStatus);
app.get('/api/user/orders', verifyUser, orderController.getUserOrders);
app.get('/api/orders/user/:userId', verifyUser, orderController.getUserOrders);

// Wishlist Routes
app.get('/api/wishlist/:userId', verifyUser, wishlistController.get);
app.post('/api/wishlist/toggle', verifyUser, wishlistController.toggle);

// Admin Routes
app.get('/api/admin/summary', isAdmin, adminController.getSummary);
app.get('/api/admin/analytics', isAdmin, adminController.getAnalytics);
app.get('/api/admin/products', isAdmin, adminController.getProducts);
app.post('/api/admin/products', isAdmin, validator.product, adminController.createProduct);
app.put('/api/admin/products/:id', isAdmin, adminController.updateProduct);
app.delete('/api/admin/products/:id', isAdmin, adminController.deleteProduct);
app.get('/api/admin/settings', isAdmin, adminController.getSettings);
app.post('/api/admin/settings', isAdmin, validator.setting, adminController.updateSetting);
app.post('/api/admin/upload', isAdmin, upload.single('image'), adminController.upload);

// Additional Admin Routes
app.get('/api/admin/categories', isAdmin, adminController.getCategories);
app.post('/api/admin/categories', isAdmin, adminController.addCategory);
app.delete('/api/admin/categories/:id', isAdmin, adminController.deleteCategory);
app.get('/api/admin/coupons', isAdmin, adminController.getCoupons);
app.post('/api/admin/coupons', isAdmin, validator.coupon, adminController.addCoupon);
app.delete('/api/admin/coupons/:id', isAdmin, adminController.deleteCoupon);
app.get('/api/admin/customers', isAdmin, adminController.getCustomers);
app.post('/api/admin/users/points', isAdmin, adminController.addLoyaltyPoints);
app.get('/api/admin/orders', isAdmin, adminController.getOrders);
app.post('/api/admin/orders/status', isAdmin, adminController.updateOrderStatus);

// --- Global Error Handler (Safety Net) ---
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  console.error('🔥 Global App Error:', isDev ? err.stack : err.message);
  
  res.status(err.status || 500).json({
    success: false,
    error: isDev ? err.message : 'An internal processing error occurred'
  });
});

module.exports = app;
