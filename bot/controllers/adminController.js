const adminService = require('../services/adminService');
const productRepository = require('../repositories/productRepository');
const settingsRepository = require('../repositories/settingsRepository');
const couponRepository = require('../repositories/couponRepository');
const uploadService = require('../services/uploadService');

const adminController = {
  getSummary: async (req, res) => {
    try {
      const summary = await adminService.getDashboardSummary();
      res.json({ success: true, ...summary });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getDashboardData: async (req, res) => {
    try {
      const data = await adminService.getDashboardData();
      res.json({ success: true, ...data });
    } catch (err) {
      console.error('🔴 Admin Batch Data Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getAnalytics: async (req, res) => {
    try {
      const stats = await adminService.getAnalytics();
      res.json({ success: true, ...stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // --- Product Management ---
  getProducts: async (req, res) => {
    try {
      const products = await productRepository.findAll();
      res.json({ success: true, products });
    } catch (err) {
      console.error('🔴 Admin Products Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  createProduct: async (req, res) => {
    try {
      const product = await productRepository.create(req.body);
      res.json({ success: true, product });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const updated = await productRepository.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ success: false, error: 'Product not found' });
      res.json({ success: true, product: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const deleted = await productRepository.delete(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, error: 'Product not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // --- Settings & Categories ---
  getSettings: async (req, res) => {
    try {
      const settings = await settingsRepository.getAll();
      res.json({ success: true, settings });
    } catch (err) {
      console.error('🔴 Admin Settings Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  updateSetting: async (req, res) => {
    try {
      const { key, value } = req.body;
      await settingsRepository.update(key, value);
      res.json({ success: true });
    } catch (err) {
      console.error('🔴 Admin Update Setting Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getCategories: async (req, res) => {
    try {
      const categories = await adminService.getCategories();
      res.json({ success: true, categories });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  addCategory: async (req, res) => {
    try {
      const category = await adminService.addCategory(req.body.name);
      res.json({ success: true, category });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  deleteCategory: async (req, res) => {
    try {
      await adminService.deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // --- Coupon Management ---
  getCoupons: async (req, res) => {
    try {
      const coupons = await adminService.getCoupons();
      res.json({ success: true, coupons });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  addCoupon: async (req, res) => {
    try {
      const coupon = await adminService.addCoupon(req.body);
      res.json({ success: true, coupon });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  deleteCoupon: async (req, res) => {
    try {
      await adminService.deleteCoupon(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // --- User Management ---
  getCustomers: async (req, res) => {
    try {
      const customers = await adminService.getCustomers();
      res.json({ success: true, customers });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  addLoyaltyPoints: async (req, res) => {
    try {
      const user = await adminService.addLoyaltyPoints(req.body.userId, req.body.points);
      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // --- Order Management ---
  getOrders: async (req, res) => {
    try {
      const orders = await adminService.getOrders();
      res.json({ success: true, orders });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  updateOrderStatus: async (req, res) => {
    try {
      const updated = await adminService.updateOrderStatus(req.body.orderId, req.body.status, req.body.trackingNumber);
      res.json({ success: true, order: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // --- Upload ---
  upload: async (req, res) => {
    try {
      const url = await uploadService.uploadImage(req.file);
      res.json({ success: true, url });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

module.exports = adminController;
