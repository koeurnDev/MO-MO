const adminService = require('../services/adminService');
const settingsRepository = require('../repositories/settingsRepository');
const productRepository = require('../repositories/productRepository');
const couponRepository = require('../repositories/couponRepository');

const publicController = {
  getInitData: async (req, res) => {
    try {
      const data = await adminService.getInitialData();
      res.json({ success: true, ...data });
    } catch (err) {
      console.error('🔴 Init Data Error:', err.message);
      res.status(500).json({ success: false });
    }
  },

  bootstrap: async (req, res) => {
    try {
       const { initData } = req.body;
       const data = await adminService.bootstrap(initData);
       res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
       res.json({ success: true, ...data });
    } catch (err) {
       console.error('🔴 Bootstrap Error:', err.message);
       res.status(500).json({ success: false });
    }
  },

  getSettings: async (req, res) => {
    try {
      const keys = req.query.keys ? req.query.keys.split(',') : null;
      const settings = keys 
        ? await settingsRepository.getByKeys(keys)
        : await settingsRepository.getAll();
      res.json({ success: true, settings });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  },

  getProducts: async (req, res) => {
    try {
      const products = await productRepository.findAll();
      res.json({ success: true, products });
    } catch (err) {
      console.error('🔴 Public Products Error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch products' });
    }
  },

  getAutoDiscounts: async (req, res) => {
    try {
      const discounts = await couponRepository.findActiveAuto();
      res.json({ success: true, discounts });
    } catch (err) {
      console.error('🔴 Public Discounts Error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to fetch discounts' });
    }
  },

  getFlags: async (req, res) => {
    try {
      // 🚀 Feature Flags: Can be moved to DB settings later for dynamic control
      const flags = {
        BETA_WISH_LIST: true,
        NEW_CHECKOUT_FLOW: true,
        PREMIUM_ADMIN_STATS: true,
        SEARCH_DEBOUNCE: true
      };
      res.json({ success: true, data: { flags } });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  }
};

module.exports = publicController;
