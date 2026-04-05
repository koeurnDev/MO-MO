const express = require('express');
const router = express.Router();
const { validateInitData } = require('../utils/auth');
const { 
  getUser, getProducts, getSetting, getCoupons, 
  getActiveAutoDiscounts, getOrdersByUser 
} = require('../db');

// 1. Session Verification
router.post('/verify', async (req, res) => {
  try {
    const { initData } = req.body;
    const isValid = validateInitData(initData, process.env.BOT_TOKEN);
    if (isValid) {
      const params = new URLSearchParams(initData);
      const userObj = JSON.parse(params.get('user') || '{}');
      const dbUser = await getUser(String(userObj.id));
      const isAdmin = Number(userObj.id) === Number(process.env.SUPERADMIN_ID);
      res.json({ success: true, user: { ...userObj, ...dbUser }, isAdmin });
    } else {
      res.status(401).json({ success: false });
    }
  } catch (err) {
    console.error('Verify API Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. User Info
router.get('/user/orders', async (req, res) => {
  const initData = req.headers['x-tg-data'];
  const isValid = validateInitData(initData, process.env.BOT_TOKEN);
  if (!isValid) return res.status(401).json({ success: false });

  try {
    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get('user') || '{}');
    const orders = await getOrdersByUser(String(user.id));
    res.json({ success: true, orders });
  } catch (err) { 
    console.error('User Orders API Error:', err);
    res.status(500).json({ success: false }); 
  }
});

// --- UNPROTECTED USER ROUTE REMOVED FOR PRIVACY ---

// 3. System Settings (Public)
router.get('/settings/shop_status', async (req, res) => {
  try {
    const status = await getSetting('shop_status');
    res.json({ success: true, status: status || 'open' });
  } catch (err) { console.error('Shop Status error:', err); res.status(500).json({ success: false }); }
});

router.get('/settings/delivery_threshold', async (req, res) => {
  try {
    const threshold = await getSetting('delivery_threshold');
    res.json({ success: true, threshold: threshold || '50' });
  } catch (err) { console.error('Threshold error:', err); res.status(500).json({ success: false }); }
});

router.get('/settings/promo_text', async (req, res) => {
  try {
    const promoText = await getSetting('promo_text');
    res.json({ success: true, promoText: promoText || '🚚 ដឹកជញ្ជូនឥតគិតថ្លៃលើរាល់ការកម្ម៉ង់!' });
  } catch (err) { console.error('Promo Text error:', err); res.status(500).json({ success: false }); }
});

router.get('/settings/delivery_fee', async (req, res) => {
  try {
    const fee = await getSetting('delivery_fee');
    res.json({ success: true, fee: fee || '1.50' });
  } catch (err) { console.error('Fee error:', err); res.status(500).json({ success: false }); }
});

router.get('/settings/payment_qr_url', async (req, res) => {
  try {
    const url = await getSetting('payment_qr_url');
    res.json({ success: true, url: url || '' });
  } catch (err) { console.error('QR URL error:', err); res.status(500).json({ success: false }); }
});

router.get('/settings/payment_info', async (req, res) => {
  try {
    const info = await getSetting('payment_info');
    res.json({ success: true, info: info || '' });
  } catch (err) { console.error('Payment Info error:', err); res.status(500).json({ success: false }); }
});

// 4. Products & Discounts
router.get('/products', async (req, res) => {
  try {
    const products = await getProducts();
    res.json({ success: true, products });
  } catch (err) { 
    console.error('Products GET API Error:', err);
    res.status(500).json({ success: false }); 
  }
});

router.get('/active_discounts', async (req, res) => {
  try {
    const discounts = await getActiveAutoDiscounts();
    res.json({ success: true, discounts });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// 5. Coupons
router.post('/coupons/validate', async (req, res) => {
  try {
    const coupons = await getCoupons();
    const found = coupons.find(c => c.code === req.body.code.toUpperCase() && c.active);
    if (found) res.json({ success: true, coupon: found });
    else res.json({ success: false, error: 'Invalid or Expired' });
  } catch (err) { 
    console.error('Coupon Validate API Error:', err);
    res.status(500).json({ success: false }); 
  }
});

module.exports = router;
