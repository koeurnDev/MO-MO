const adminService = require('../services/adminService');
const cacheService = require('../services/cacheService');
const productRepository = require('../repositories/productRepository');
const settingsRepository = require('../repositories/settingsRepository');
const couponRepository = require('../repositories/couponRepository');
const uploadService = require('../services/uploadService');
const { formatFullAddress } = require('../utils/deliveryUtils');

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
      const data = await cacheService.getOrFetch(
        'admin:dashboard_data',
        async () => await adminService.getDashboardData(),
        30 // 30 seconds cache for real-time feel without crushing the DB
      );
      
      let userRole = 'staff';
      if (Number(req.user.user_id) === Number(process.env.SUPERADMIN_ID)) {
        userRole = 'admin';
      } else {
        const userRepository = require('../repositories/userRepository');
        const dbUser = await userRepository.findById(String(req.user.user_id));
        if (dbUser && dbUser.role === 'admin') userRole = 'admin';
      }

      res.json({ success: true, userRole, ...data });
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
      if (req.body.category) {
        await require('../services/adminService').addCategory(req.body.category);
      }
      const product = await productRepository.create(req.body);
      res.json({ success: true, product });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  updateProduct: async (req, res) => {
    try {
      if (req.body.category) {
        await require('../services/adminService').addCategory(req.body.category);
      }

      // Fetch old product for asset cleanup comparison
      const oldProduct = await productRepository.findById(req.params.id);

      const updated = await productRepository.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ success: false, error: 'Product not found' });

      // 🧹 Non-blocking Cloudinary Cleanup for replaced/removed assets
      if (oldProduct) {
        (async () => {
          try {
            if (oldProduct.image && oldProduct.image !== updated.image) {
              uploadService.deleteImageByUrl(oldProduct.image);
            }
            if (oldProduct.video_url && oldProduct.video_url !== updated.video_url) {
              uploadService.deleteImageByUrl(oldProduct.video_url);
            }
            const oldAdd = typeof oldProduct.additional_images === 'string' ? JSON.parse(oldProduct.additional_images) : (oldProduct.additional_images || []);
            const newAdd = typeof updated.additional_images === 'string' ? JSON.parse(updated.additional_images) : (updated.additional_images || []);
            const removedImages = oldAdd.filter(img => !newAdd.includes(img));
            removedImages.forEach(imgUrl => uploadService.deleteImageByUrl(imgUrl));
          } catch (cleanErr) {
            console.warn('⚠️ Cloudinary Update Cleanup Warning:', cleanErr.message);
          }
        })();
      }

      res.json({ success: true, product: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const deleted = await productRepository.delete(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, error: 'Product not found' });

      // 🧹 Non-blocking Cloudinary Asset Cleanup to save storage
      (async () => {
        try {
          if (deleted.image) uploadService.deleteImageByUrl(deleted.image);
          if (deleted.video_url) uploadService.deleteImageByUrl(deleted.video_url);
          if (deleted.additional_images) {
            const addImages = typeof deleted.additional_images === 'string'
              ? JSON.parse(deleted.additional_images)
              : (deleted.additional_images || []);
            addImages.forEach(imgUrl => uploadService.deleteImageByUrl(imgUrl));
          }
        } catch (cleanErr) {
          console.warn('⚠️ Cloudinary Cleanup Background Warning:', cleanErr.message);
        }
      })();

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

  addLoyaltyPoints: async (req, res) => {
    try {
      const adminService = require('../services/adminService');
      const { userId, points } = req.body;
      const updatedUser = await adminService.addLoyaltyPoints(userId, points);
      res.json({ success: true, points: updatedUser.loyalty_points });
    } catch (err) {
      console.error('🔴 Admin Loyalty Points Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  exportOrders: async (req, res) => {
    try {
      const orderRepository = require('../repositories/orderRepository');
      const orders = await orderRepository.findAll(10000, 0); // Fetch up to 10k orders for export
      
      let csv = 'Order ID,Date,Customer Name,Customer Phone,Status,Total ($),Total (KHR)\n';
      
      for (const o of orders) {
        const id = o.order_code || o.id;
        const date = new Date(o.created_at).toISOString().split('T')[0];
        const name = `"${(o.user_name || o.first_name || 'N/A').replace(/"/g, '""')}"`;
        const phone = o.phone || 'N/A';
        const status = o.status;
        const totalUsd = parseFloat(o.total || 0).toFixed(2);
        const totalKhr = parseFloat(o.total_khr || 0).toFixed(2);
        
        csv += `${id},${date},${name},${phone},${status},${totalUsd},${totalKhr}\n`;
      }
      
      res.header('Content-Type', 'text/csv');
      res.attachment('orders_export.csv');
      res.send(csv);
    } catch (err) {
      console.error('🔴 Admin Export Orders Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getOrders: async (req, res) => {
    try {
      const categories = await adminService.getCategories();
      res.json({ success: true, categories });
    } catch (err) {
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
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);
      const offset = Math.max(parseInt(req.query.offset) || 0, 0);
      const customers = await adminService.getCustomers(limit, offset);
      res.json({ success: true, customers: customers || [] });
    } catch (err) {
      console.error('🔴 adminController.getCustomers Error:', err);
      res.json({ success: true, customers: [], error: err.message });
    }
  },

  getCustomerAvatar: async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).end();
      }
      const telegramAvatarService = require('../services/telegramAvatarService');
      const streamed = await telegramAvatarService.streamAvatar(userId, res);
      if (!streamed && !res.headersSent) {
        res.status(404).end();
      }
    } catch (err) {
      console.warn('⚠️ getCustomerAvatar:', err.message);
      if (!res.headersSent) res.status(404).end();
    }
  },

  deleteCustomer: async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ success: false, error: 'User ID មិនត្រឹមត្រូវ' });
      }
      const userRepository = require('../repositories/userRepository');
      const targetUser = await userRepository.findById(userId);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'រកមិនឃើញគណនីនេះទេ' });
      }
      // Prevent deleting Admin or SuperAdmin
      if (targetUser.role === 'admin' || userId === Number(process.env.SUPERADMIN_ID)) {
        return res.status(400).json({ success: false, error: 'មិនអាចលុបគណនី Admin បានទេ!' });
      }
      await userRepository.deleteUser(userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  banCustomer: async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ success: false, error: 'User ID មិនត្រឹមត្រូវ' });
      }
      const userRepository = require('../repositories/userRepository');
      const targetUser = await userRepository.findById(userId);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'រកមិនឃើញគណនីនេះទេ' });
      }
      // Prevent banning Admin or SuperAdmin
      if (targetUser.role === 'admin' || userId === Number(process.env.SUPERADMIN_ID)) {
        return res.status(400).json({ success: false, error: 'មិនអាចផ្អាកគណនី Admin បានទេ!' });
      }
      const updated = await userRepository.updateBanStatus(userId, req.body.isBanned ?? req.body.is_banned);
      res.json({ success: true, user: updated });
    } catch (err) {
      console.error('🔴 Admin Ban Customer Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  updateCustomerRole: async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ success: false, error: 'User ID មិនត្រឹមត្រូវ' });
      }
      const userRepository = require('../repositories/userRepository');
      const { role } = req.body;
      if (!['user', 'staff', 'admin'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role' });
      }
      // Prevent changing SuperAdmin role
      if (userId === Number(process.env.SUPERADMIN_ID)) {
        return res.status(400).json({ success: false, error: 'Cannot modify SuperAdmin role' });
      }
      const updated = await userRepository.updateRole(userId, role);
      res.json({ success: true, user: updated });
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
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);
      const offset = Math.max(parseInt(req.query.offset) || 0, 0);
      const orders = await adminService.getOrders(limit, offset);
      res.json({ success: true, orders });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  updateOrderStatus: async (req, res) => {
    try {
      const adminService = require('../services/adminService');
      const orderRepository = require('../repositories/orderRepository');

      // 🛡️ Prevent Duplicate Notification: If status is already updated, don't send Telegram notification again
      const existingOrder = await orderRepository.findByIdOrCode(req.body.orderId);
      if (existingOrder && existingOrder.status === req.body.status) {
        return res.json({ success: true, order: existingOrder, skippedDuplicate: true });
      }

      // 📦 Stock Restoration Handling on Cancellation
      if (existingOrder && existingOrder.status !== 'cancelled' && req.body.status === 'cancelled') {
        try {
          let items = [];
          if (typeof existingOrder.items === 'string') items = JSON.parse(existingOrder.items);
          else if (Array.isArray(existingOrder.items)) items = existingOrder.items;

          if (items.length > 0) {
            await productRepository.restoreStockBatch(items);
            console.log(`📦 Restored stock for cancelled order #${existingOrder.order_code || existingOrder.id}`);
          }
        } catch (stkErr) {
          console.error('🔴 Stock restoration error on order cancellation:', stkErr.message);
        }
      }

      const updated = await adminService.updateOrderStatus(req.body.orderId, req.body.status, req.body.trackingNumber);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      
      // 🚀 Feature 1: Telegram Bot Notifications (Async Fire-and-Forget to prevent UI lag/timeout)
      try {
        const bot = require('../config/telegram');
        const statusMap = {
          'paid': 'បានបង់ប្រាក់រួចរាល់ ✅',
          'processing': 'កំពុងរៀបចំអីវ៉ាន់ 📦',
          'shipped': 'ប្រគល់ជូនអ្នកដឹកជញ្ជូន 🚚',
          'delivered': 'បានដល់ដៃអតិថិជន 🎉',
          'cancelled': 'បោះបង់ ❌'
        };
        const statusText = statusMap[updated.status] || updated.status;
        const displayCode = updated.order_code || updated.id;

        let itemListText = '';
        try {
          const items = typeof updated.items === 'string' ? JSON.parse(updated.items) : (updated.items || []);
          itemListText = items.map(it => `• ${it.name || it.product_name || 'ទំនិញ'} x${it.quantity || 1} ($${((it.price || 0) * (it.quantity || 1)).toFixed(2)})`).join('\n');
        } catch (e) {}

        const orderDateStr = new Date(updated.created_at || Date.now()).toLocaleString('en-GB', {
          timeZone: 'Asia/Phnom_Penh',
          hour12: true
        });

        let msg = `សួស្តីបង! ការកម្ម៉ង់របស់បងលេខសម្គាល់៖ \`${displayCode}\`\n`;
        msg += `ការបរិច្ឆេទទិញ ${orderDateStr}\n\n`;
        if (itemListText) {
          msg += `🛍️ *ទំនិញដែលបានទិញ៖*\n${itemListText}\n\n`;
        }
        msg += `💰 *តម្លៃសរុប៖* $${parseFloat(updated.total || 0).toFixed(2)}\n`;

        if (updated.phone) {
          msg += `📞 *លេខទូរស័ព្ទ៖* \`${updated.phone}\`\n`;
        }
        const fullAddr = formatFullAddress(updated.address, updated.province);
        if (fullAddr) {
          msg += `📍 *អាសយដ្ឋាន៖* ${fullAddr}\n`;
        }
        if (updated.note) {
          msg += `📝 *ចំណាំ៖* ${updated.note}\n`;
        }

        msg += `\n📌 *ត្រូវបានប្តូរស្ថានភាពទៅជា៖*  *${statusText}*`;

        const trackingNum = updated.tracking_number || req.body.trackingNumber;
        if (trackingNum) {
          msg += `\n\n🚚 *លេខ Tracking ៖* \`${trackingNum}\``;
        }
        
        // Fire and forget — DO NOT AWAIT
        bot.telegram.sendMessage(String(updated.user_id), msg, { parse_mode: 'Markdown' })
          .then(() => console.log(`✅ Telegram order status sent to user ${updated.user_id}`))
          .catch(tgErr => console.warn(`⚠️ Telegram order status failed for user ${updated.user_id}:`, tgErr.message));
          
      } catch (tgErr) {
        console.warn('⚠️ Could not configure telegram notification:', tgErr.message);
      }
      
      res.json({ success: true, order: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // --- Upload ---
  upload: async (req, res) => {
    try {
      const url = await uploadService.uploadImage(req.file);
      
      // If client requests to send to user and we have a valid user ID from auth middleware
      if (req.query.send_to_user === 'true' && req.user && req.user.user_id) {
        try {
          const bot = require('../config/telegram');
          if (bot && bot.telegram) {
            await bot.telegram.sendPhoto(req.user.user_id, url, {
              caption: `🧾 *វិក្កយបត្រ MARUN MINI STORE*\n\nសូមអរគុណសម្រាប់ការគាំទ្រ! វិក្កយបត្ររបស់អ្នកត្រូវបានរក្សាទុកជោគជ័យ។`,
              parse_mode: 'Markdown'
            });
          }
        } catch (botErr) {
          console.error("Failed to send receipt to user via bot:", botErr);
        }
      }

      res.json({ success: true, url });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  deleteFile: async (req, res) => {
    try {
      const { url } = req.body;
      if (url) await uploadService.deleteImageByUrl(url);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // --- Broadcast ---
  broadcast: async (req, res) => {
    try {
      const { message, photoUrl } = req.body;
      if (!message && !photoUrl) return res.status(400).json({ success: false, message: 'Content missing' });

      const userRepository = require('../repositories/userRepository');
      const broadcastRepository = require('../repositories/broadcastRepository');
      const notificationService = require('../services/notificationService');

      const userIds = await userRepository.getAllIds();

      // Save broadcast in database for in-app NotificationsModal
      await broadcastRepository.create(message, photoUrl);
      cacheService.delete('public:notifications');

      // 🚀 Offload long-running broadcast job to resilient background Bull Queue
      await notificationService.sendBroadcast(userIds, message, photoUrl);

      res.json({ success: true, count: userIds.length });
    } catch (err) {
      console.error('Broadcast Fail:', err);
      if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    }
  },

  // 🟢 Online Users: who is actively using the app right now
  getOnlineUsers: async (req, res) => {
    try {
      const userRepository = require('../repositories/userRepository');
      const [online, recent] = await Promise.all([
        userRepository.getOnlineUsers(5),   // active within 5 min = "online"
        userRepository.getOnlineUsers(60),  // active within 60 min = "recent"
      ]);

      // Enrich with "minutes ago"
      const now = Date.now();
      const enrich = (users) => users.map(u => ({
        user_id: u.user_id,
        user_name: u.user_name || `User ${String(u.user_id).slice(-4)}`,
        last_seen: u.last_seen,
        minutes_ago: Math.floor((now - new Date(u.last_seen).getTime()) / 60000)
      }));

      res.json({
        success: true,
        online: enrich(online),
        recent: enrich(recent),
        online_count: online.length,
        recent_count: recent.length
      });
    } catch (err) {
      console.error('🔴 getOnlineUsers Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  scanBrokenImages: async (req, res) => {
    try {
      const imageHealthService = require('../services/imageHealthService');
      const clearDb = req.body?.clearDb === true;
      const result = await imageHealthService.scanAndRepairProducts({ clearDb });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('🔴 scanBrokenImages Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },
};

module.exports = adminController;
