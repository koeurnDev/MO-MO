const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { observabilityLogger, telemetryHandler } = require('./middleware/observability');
const { globalLimiter } = require('./middleware/rateLimiter');
const { verifyUser, isStaffOrAdmin, isSuperAdminOnly } = require('./middleware/auth');
const validator = require('./middleware/validator');

// Controller Imports
const publicController = require('./controllers/publicController');
const orderController = require('./controllers/orderController');
const adminController = require('./controllers/adminController');
const wishlistController = require('./controllers/wishlistController');
const faqController = require('./controllers/faqController');
const analyticsController = require('./controllers/analyticsController');

// Middleware Config
const { orderCreationLimiter } = require('./middleware/rateLimiter');
const os = require('os');
const path = require('path');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 20, // limit each admin to 20 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many files uploaded, please try again after an hour' }
});

const upload = multer({ 
  // 🛡️ SECURITY FIX: Use diskStorage instead of memoryStorage to prevent OOM (DDoS)
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 🛡 Limit to 5MB to prevent Storage Exhaustion
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only images and videos are allowed'));
  }
});

const app = express();
app.set('trust proxy', 1);

// --- Standard Middleware ---
app.use(compression({
  level: 6,
  threshold: 1024,
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
      connectSrc: ["'self'", "https://*.telegram.org", process.env.VITE_BACKEND_URL || "https://tg-mini-app-bot.onrender.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
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
    const allowed = [process.env.WEBAPP_URL].filter(Boolean);

    if (isDev) {
      allowed.push(
        'http://localhost:5173', 'http://127.0.0.1:5173',
        'http://localhost:5174', 'http://127.0.0.1:5174',
        'http://localhost:5175', 'http://127.0.0.1:5175',
        'http://localhost:3000', 'http://127.0.0.1:3000'
      );
    }

    const isLocalhostDev = isDev && origin && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

    // 🛠️ Dev: Allow all private network IPs (192.168.x.x, 10.x.x.x) for mobile testing
    const isPrivateNetwork = isDev && origin && (
      /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
      /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
      /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/.test(origin)
    );

    if (!origin || allowed.includes(origin) || isPrivateNetwork || isLocalhostDev) {
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
app.get('/api/alive', async (req, res) => {
  const cacheService = require('./services/cacheService');
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    cache: cacheService.getStats(),
  });
});
app.post('/api/v1/app-state', telemetryHandler);

app.use('/api', globalLimiter);

// ✅ Performance: Stale-While-Revalidate Caching for Products (Optimized for Real-time Stock)
app.get('/api/products', (req, res, next) => {
  res.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30');
  next();
});

// Public Routes
app.get('/api/init', publicController.getInitData);
app.get('/api/settings', publicController.getSettings);
app.get('/api/products', publicController.getProducts);
app.get('/api/products/:id', publicController.getProductById);
app.get('/api/flags', publicController.getFlags); // 🚀 Combined Feature Flags
app.get('/api/notifications', publicController.getNotifications); // 🔔 In-App System Messages
app.delete('/api/notifications/:id', isStaffOrAdmin, publicController.deleteNotification); // 🗑️ Delete Notification (Staff/Admin Only)
app.post('/api/images/report-broken', publicController.reportBrokenImage);
app.get('/api/faqs', faqController.getFaqs);

// Reviews Routes
const reviewController = require('./controllers/reviewController');
app.get('/api/products/:productId/reviews', reviewController.getReviewsByProduct);
app.post('/api/reviews', verifyUser, reviewController.createReview);

// Order Routes
app.post('/api/orders', verifyUser, orderCreationLimiter, validator.order, orderController.createOrder);
app.post('/api/orders/confirm', verifyUser, orderController.confirmOrder); // ✅ Fix: was missing, frontend calls this
app.get('/api/orders/status/:orderCode', verifyUser, orderController.getStatus);
app.post('/api/orders/validate-coupon', verifyUser, orderController.validateCoupon);
app.get('/api/user/orders', verifyUser, orderController.getUserOrders);
app.post('/api/orders/receipt', verifyUser, orderController.uploadReceipt);

// User Upload Route
app.post('/api/upload', verifyUser, uploadLimiter, upload.single('image'), adminController.upload);

const userController = require('./controllers/userController');

// User Profile Routes
app.get('/api/user/profile', verifyUser, userController.getProfile);
app.put('/api/user/profile', verifyUser, userController.updateProfile);
app.post('/api/ping', verifyUser, userController.ping);

// Wishlist Routes
app.get('/api/wishlist', verifyUser, wishlistController.getMine);
app.get('/api/wishlist/:userId', verifyUser, wishlistController.get);
app.post('/api/wishlist/toggle', verifyUser, wishlistController.toggle);

// Admin Routes
app.get('/api/admin/online-users', isSuperAdminOnly, adminController.getOnlineUsers);
app.get('/api/admin/summary', isSuperAdminOnly, adminController.getSummary);
app.get('/api/admin/analytics', isSuperAdminOnly, adminController.getAnalytics);
app.get('/api/admin/advanced-analytics', isSuperAdminOnly, analyticsController.getAdvancedAnalytics);
app.get('/api/admin/dashboard', isStaffOrAdmin, (req, res) => adminController.getDashboardData(req, res)); // 🚀 Batch Endpoint (Ensuring visibility)
app.post('/api/admin/products/scan-images', isStaffOrAdmin, adminController.scanBrokenImages);
app.get('/api/admin/products', isStaffOrAdmin, adminController.getProducts);
app.post('/api/admin/products', isStaffOrAdmin, validator.product, adminController.createProduct);
app.put('/api/admin/products/:id', isStaffOrAdmin, validator.product, adminController.updateProduct);
app.delete('/api/admin/products/:id', isStaffOrAdmin, adminController.deleteProduct);
app.get('/api/admin/settings', isSuperAdminOnly, adminController.getSettings);
app.post('/api/admin/settings', isSuperAdminOnly, validator.setting, adminController.updateSetting);
app.post('/api/admin/upload', isStaffOrAdmin, upload.single('image'), adminController.upload);
app.post('/api/admin/delete-file', isStaffOrAdmin, adminController.deleteFile);

// Admin FAQs
app.get('/api/admin/faqs', isStaffOrAdmin, faqController.getAdminFaqs);
app.post('/api/admin/faqs', isStaffOrAdmin, faqController.createFaq);
app.put('/api/admin/faqs/:id', isStaffOrAdmin, faqController.updateFaq);
app.delete('/api/admin/faqs/:id', isStaffOrAdmin, faqController.deleteFaq);

// Additional Admin Routes
app.get('/api/admin/categories', isStaffOrAdmin, adminController.getCategories);
app.post('/api/admin/categories', isStaffOrAdmin, adminController.addCategory);
app.delete('/api/admin/categories/:id', isStaffOrAdmin, adminController.deleteCategory);
app.get('/api/admin/coupons', isSuperAdminOnly, adminController.getCoupons);
app.post('/api/admin/coupons', isSuperAdminOnly, validator.coupon, adminController.addCoupon);
app.delete('/api/admin/coupons/:id', isSuperAdminOnly, adminController.deleteCoupon);
app.get('/api/admin/customers', isSuperAdminOnly, adminController.getCustomers);
app.get('/api/admin/avatar/:id', isStaffOrAdmin, adminController.getCustomerAvatar);
app.delete('/api/admin/customers/:id', isSuperAdminOnly, adminController.deleteCustomer);
app.put('/api/admin/customers/:id/ban', isSuperAdminOnly, adminController.banCustomer);
app.put('/api/admin/customers/:id/role', isSuperAdminOnly, adminController.updateCustomerRole);
app.post('/api/admin/users/points', isSuperAdminOnly, adminController.addLoyaltyPoints);
app.get('/api/admin/orders/export', isSuperAdminOnly, adminController.exportOrders);
app.get('/api/admin/orders', isStaffOrAdmin, adminController.getOrders);
app.post('/api/admin/orders/status', isStaffOrAdmin, adminController.updateOrderStatus);
app.post('/api/admin/broadcast', isStaffOrAdmin, adminController.broadcast);

// --- Global Error Handler (Safety Net) ---
app.use((err, req, res, next) => {
  console.error('🔥 Global App Error:', err.stack);

  // 🧹 Stale Multer Disk Storage Cleanup to prevent orphaned /tmp files on upload errors
  try {
    const fs = require('fs');
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }
    if (req.files) {
      const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
      files.forEach(f => {
        if (f.path && fs.existsSync(f.path)) fs.unlink(f.path, () => {});
      });
    }
  } catch (cleanErr) {
    console.warn('⚠️ Multer Temp File Cleanup Warning:', cleanErr.message);
  }

  res.status(err.status || err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;
