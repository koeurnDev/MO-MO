const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { isAdmin } = require('../middleware/auth');
const upload = multer({ storage: multer.memoryStorage() });

const { 
  getProducts, getOrders, updateOrderStatus, addProduct, updateProduct, deleteProduct, 
  getAnalytics, getCustomers, getCoupons, addCoupon, deleteCoupon, getSetting, updateSetting,
  getCategories, addCategory, deleteCategory, addLoyaltyPoints
} = require('../db');

// --- Helper to get bot for notifications ---
let bot;
router.setBot = (b) => { bot = b; };

// 1. Categories
router.get('/categories', isAdmin, async (req, res) => {
  try {
    const cats = await getCategories();
    res.json({ success: true, categories: cats });
  } catch (err) { 
    console.error('Categorires GET error:', err);
    res.status(500).json({ success: false, error: err.message }); 
  }
});

router.post('/categories', isAdmin, async (req, res) => {
  try {
    const cat = await addCategory(req.body.name);
    res.json({ success: true, category: cat });
  } catch (err) { 
    console.error('Categories POST error:', err);
    res.status(500).json({ success: false, error: err.message }); 
  }
});

router.delete('/categories/:id', isAdmin, async (req, res) => {
  try {
    await deleteCategory(req.params.id);
    res.json({ success: true });
  } catch (err) { 
    console.error('Categories DELETE error:', err);
    res.status(500).json({ success: false, error: err.message }); 
  }
});

// 2. Analytics
router.get('/analytics', isAdmin, async (req, res) => {
  try {
    const data = await getAnalytics();
    res.json({ success: true, ...data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/customers', isAdmin, async (req, res) => {
  try {
    const customers = await getCustomers();
    res.json({ success: true, customers });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 3. User Points
router.post('/users/points', isAdmin, async (req, res) => {
  const { userId, points } = req.body;
  try {
    const user = await addLoyaltyPoints(userId, points);
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 4. Coupons
router.get('/coupons', isAdmin, async (req, res) => {
  try {
    const coupons = await getCoupons();
    res.json({ success: true, coupons });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/coupons', isAdmin, async (req, res) => {
  try {
    const coupon = await addCoupon(req.body);
    res.json({ success: true, coupon });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/coupons/:id', isAdmin, async (req, res) => {
  try {
    await deleteCoupon(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 5. Settings
router.get('/settings/:key', isAdmin, async (req, res) => {
  try {
    const value = await getSetting(req.params.key);
    res.json({ success: true, value });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/settings', isAdmin, async (req, res) => {
  try {
    await updateSetting(req.body.key, req.body.value);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 6. Products & Upload
router.post('/upload', isAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file' });
    cloudinary.uploader.upload_stream({ folder: 'products' }, (error, result) => {
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true, url: result.secure_url });
    }).end(req.file.buffer);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/products', isAdmin, async (req, res) => {
  try {
    const product = await addProduct(req.body);
    res.json({ success: true, product });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/products/:id', isAdmin, async (req, res) => {
  try {
    const product = await updateProduct(req.params.id, req.body);
    res.json({ success: true, product });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/products/:id', isAdmin, async (req, res) => {
  try {
    const products = await getProducts();
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (product && product.image && product.image.includes('cloudinary.com')) {
      const parts = product.image.split('/');
      const fileName = parts[parts.length - 1].split('.')[0];
      const folder = parts[parts.length - 2];
      await cloudinary.uploader.destroy(`${folder}/${fileName}`).catch(e => console.error(e));
    }
    await deleteProduct(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 7. Orders Management
router.get('/orders', isAdmin, async (req, res) => {
  try {
    const orders = await getOrders();
    res.json({ success: true, orders });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/orders/status', isAdmin, async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const updated = await updateOrderStatus(orderId, status);
    
    // 🔔 Automated User Notifications
    if (updated.user_id && bot) {
      let msg = '';
      if (status === 'processing') msg = `📦 *ការកម្ម៉ង់ #MO-${orderId}*: ហាង MO MO Boutique កំពុង *រៀបចំអីវ៉ាន់* របស់បងហើយ!`;
      if (status === 'shipped') msg = `✨ *ការកម្ម៉ង់ #MO-${orderId}*: *អីវ៉ាន់បានចេញ* ពីហាង MO MO Boutique ហើយ!`;
      if (status === 'delivering') msg = `🚚 *ការកម្ម៉ង់ #MO-${orderId}*: អីវ៉ាន់បង *កំពុងដឹក* ជូនហើយ! វានឹងទៅដល់ក្នុងពេលឆាប់ៗនេះ។`;
      if (status === 'paid') msg = `✅ *ការកម្ម៉ង់ #MO-${orderId}*: ការបង់ប្រាក់ត្រូវបានបញ្ជាក់រួចរាល់!`;
      
      if (msg) {
        bot.telegram.sendMessage(updated.user_id, msg, { parse_mode: 'Markdown' })
          .catch(e => console.error('Notify Failed:', e.message));
      }
    }

    res.json({ success: true, order: updated });
  } catch (err) { 
    console.error('Status Error:', err);
    res.status(500).json({ success: false, error: err.message }); 
  }
});

router.post('/orders/confirm', isAdmin, async (req, res) => {
  try {
    const { orderId } = req.body;
    const updated = await updateOrderStatus(orderId, 'paid');
    
    if (updated.user_id && bot) {
       bot.telegram.sendMessage(updated.user_id, `✅ ការបង់ប្រាក់សម្រាប់ #MO-${orderId} ត្រូវបានបញ្ជាក់! អរគុណសម្រាប់ការគាំទ្រពី MO MO Boutique។`).catch(e => console.error(e));
    }
    res.json({ success: true, order: updated });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/notify', isAdmin, async (req, res) => {
  const { userId, orderId, status } = req.body;
  const msg = status === 'completed' ? `🎉 #ORDER-${orderId} របស់អ្នករួចរាល់ហើយ!` : `⏳ #ORDER-${orderId} កំពុងរង់ចាំ។`;
  try {
    if (bot) await bot.telegram.sendMessage(userId, msg);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/broadcast', isAdmin, async (req, res) => {
  const { message } = req.body;
  if (!message || !bot) return res.status(400).json({ success: false, message: 'Message missing' });

  try {
    const users = await getCustomers();
    const userIds = [...new Set(users.map(u => u.user_id))]; // Unique IDs
    
    // 🔥 Non-blocking background broadcast
    res.json({ success: true, count: userIds.length });

    for (const uid of userIds) {
      if (!uid) continue;
      bot.telegram.sendMessage(uid, message, { parse_mode: 'Markdown' })
        .catch(e => console.error(`Broadcast skip ${uid}:`, e.message));
      
      // ⏳ Small delay to avoid Telegram rate limits if many users
      await new Promise(r => setTimeout(r, 100)); 
    }
  } catch (err) {
    console.error('Broadcast Fail:', err);
    if (!res.headersSent) res.status(500).json({ success: false });
  }
});

module.exports = router;
