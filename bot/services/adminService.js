const orderRepository = require('../repositories/orderRepository');
const productRepository = require('../repositories/productRepository');
const userRepository = require('../repositories/userRepository');
const settingsRepository = require('../repositories/settingsRepository');
const couponRepository = require('../repositories/couponRepository');

const adminService = {
  getDashboardSummary: async () => {
    const [revenue, totalOrders, activeOrders, customers, productStats, orderHealth] = await Promise.all([
      orderRepository.getRevenueSummary(),
      orderRepository.getTotalCount(),
      orderRepository.getActiveCount(),
      userRepository.getCount(),
      productRepository.getInventoryStats(),
      orderRepository.getHealthStats()
    ]);

    const stockScore = (productStats.inStock / (productStats.total || 1)) * 40;
    const orderScore = (parseInt(orderHealth.healthy) / (parseInt(orderHealth.total) || 1)) * 60;
    const health = Math.round(stockScore + orderScore);

    return {
      totalRevenue: revenue,
      totalOrders,
      activeOrders,
      totalCustomers: customers,
      businessHealth: Math.max(0, Math.min(100, health))
    };
  },

  getAnalytics: async () => {
    const [daily, status] = await Promise.all([
      orderRepository.getDailyStats(14),
      orderRepository.getStatusDistribution()
    ]);
    return { daily, status };
  },

  getInitialData: async () => {
    const [products, settings, categories, discounts] = await Promise.all([
      productRepository.findAll(),
      settingsRepository.getByKeys([
        'shop_status', 'delivery_threshold', 'delivery_fee', 'promo_text', 
        'payment_qr_url', 'payment_info', 'promo_banner_url', 'shop_logo_url'
      ]),
      settingsRepository.getCategories(),
      couponRepository.findActiveAuto()
    ]);

    return { products, settings, categories, discounts };
  },

  bootstrap: async (initData = null) => {
    const [initDataResult, categories, allSettings] = await Promise.all([
      adminService.getInitialData(),
      settingsRepository.getCategories(),
      settingsRepository.getAll()
    ]);

    let user = null;
    let isAdmin = false;
    let wishlist = [];

    if (initData) {
      const { validateInitData } = require('../utils/auth');
      const isValid = validateInitData(initData, process.env.BOT_TOKEN);
      if (isValid) {
        const params = new URLSearchParams(initData);
        const tgUser = JSON.parse(params.get('user') || '{}');
        const dbUser = await userRepository.findById(tgUser.id);
        
        user = { ...tgUser, ...dbUser };
        isAdmin = Number(tgUser.id) === Number(process.env.SUPERADMIN_ID);
        
        const wishlistData = await require('../repositories/wishlistRepository').findByUserId(tgUser.id);
        wishlist = wishlistData.map(w => w.product_id);
      }
    }

    return {
      ...initDataResult,
      categories,
      allSettings,
      user,
      isAdmin,
      wishlist
    };
  },

  // --- Category Management ---
  getCategories: async () => {
    return await settingsRepository.getCategories();
  },

  addCategory: async (name) => {
    return await settingsRepository.addCategory(name);
  },

  deleteCategory: async (id) => {
    return await settingsRepository.deleteCategory(id);
  },

  // --- Coupon Management ---
  getCoupons: async () => {
    return await couponRepository.findAll();
  },

  addCoupon: async (couponData) => {
    return await couponRepository.create(couponData);
  },

  deleteCoupon: async (id) => {
    return await couponRepository.delete(id);
  },

  // --- User Management ---
  getCustomers: async () => {
    return await userRepository.findAll();
  },

  addLoyaltyPoints: async (userId, points) => {
    return await userRepository.addLoyaltyPoints(userId, points);
  },

  // --- Order Management ---
  getOrders: async () => {
    return await orderRepository.findAll();
  },

  updateOrderStatus: async (orderId, status, trackingNumber) => {
    return await orderRepository.updateStatus(orderId, status, trackingNumber);
  }
};

module.exports = adminService;
