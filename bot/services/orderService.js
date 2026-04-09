const orderRepository = require('../repositories/orderRepository');
const productRepository = require('../repositories/productRepository');
const couponRepository = require('../repositories/couponRepository');
const settingsRepository = require('../repositories/settingsRepository');
const userRepository = require('../repositories/userRepository');
const notificationService = require('./notificationService');
const QueueService = require('./QueueService');
const bakongService = require('./bakongService');
const pool = require('../config/database');
const { calculateBestDiscount, getDiscountedPrice } = require('../utils/discountUtils');
const { BakongKHQR, IndividualInfo, khqrData } = require('bakong-khqr');
const khqr = new BakongKHQR();

const orderService = {
  /**
   * Refactored for Elite Architect EDA:
   * Focuses strictly on ACID consistency and fast response.
   * Offloads side-effects to the Job Queue.
   */
  async createOrder(payload, tgUser) {
    const client = await pool.connect();
    try {
      const { userId, userName, items, total, deliveryInfo, idempotencyKey } = payload;
      
      // 🛡️ Pre-Flight Health Check: Ensure Bakong is reachable and Token is valid 
      // before we even bother creating the order and showing the QR code.
      const health = await bakongService.checkHealth();
      if (!health.success) {
        console.error('🔴 Gateway Pre-flight Failed:', health.message);
        throw new Error('ប្រព័ន្ធបង់ប្រាក់កំពុងរវល់ ឬថែទាំ (Maintenance)។ សូមមេត្តាព្យាយាមម្តងទៀតក្នុងរយៈពេល ៥ នាទីទៀត។');
      }

      if (String(tgUser.id) !== String(userId)) {
        console.error(`🔴 Identity Mismatch: TG[${tgUser.id}] vs Payload[${userId}]`);
        throw new Error('Identity Mismatch');
      }

      const shopStatus = await settingsRepository.get('shop_status');
      if (shopStatus === 'closed') throw new Error('Shop closed');

      // 1. Idempotency Guard (Pre-check outside transaction)
      if (idempotencyKey) {
        let existing = await orderRepository.findByIdempotencyKey(userId, idempotencyKey);
        if (existing) {
          const now = Date.now();
          const exp = new Date(existing.expires_at).getTime();
          const isExpired = exp <= now;

          console.log(`🛡️ Idempotency: Hit for [${idempotencyKey}]. Status: ${existing.status}, Expired: ${isExpired}`);

          // 🔄 Refresh Window: If it's an old order attempt that expired, give it a fresh 5 mins
          if (isExpired && existing.status === 'pending') {
            console.log(`♻️ Idempotency: Refreshing expiry for Order ${existing.order_code}`);
            const newExpiry = new Date(now + 5 * 60 * 1000);
            existing = await orderRepository.updateExpiry(existing.id, newExpiry);
            
            // 🏷️ KHQR Refresh: Generate a new QR string with a fresh 15-min bank window
            await this.generateQR(existing);
            // Re-fetch to get the new qr_string
            existing = await orderRepository.findById(existing.id);
          }

          existing.expires_in = Math.max(0, Math.floor((new Date(existing.expires_at).getTime() - Date.now()) / 1000));
          return { order: existing, cached: true };
        }
      }

      // 2. Data Retrieval (Parallelized)
      const itemIds = items.map(i => i.id);
      const [dbProducts, activeDiscounts, dbSettings] = await Promise.all([
        productRepository.findByIds(itemIds),
        couponRepository.findActiveAuto(),
        settingsRepository.getByKeys(['delivery_threshold', 'delivery_fee', 'bakong_account_id', 'bakong_merchant_name'])
      ]);

      // 3. Price Verification
      const threshold = parseFloat(dbSettings.delivery_threshold || '50');
      const fee = parseFloat(dbSettings.delivery_fee || '1.50');
      let grossTotal = 0, totalItemDiscount = 0, totalQty = 0;

      for (const cartItem of items) {
        const realProduct = dbProducts.find(p => p.id === cartItem.id);
        if (!realProduct) throw new Error('Invalid Product');
        grossTotal += realProduct.price * cartItem.quantity;
        totalQty += cartItem.quantity;
        const best = calculateBestDiscount(realProduct, activeDiscounts);
        const discountedPrice = getDiscountedPrice(realProduct, best);
        totalItemDiscount += (realProduct.price - discountedPrice) * cartItem.quantity;
      }

      const bundleBonus = totalQty >= 3 ? (grossTotal * 0.05) : 0;
      const subtotal = Math.max(0, grossTotal - totalItemDiscount - bundleBonus);
      const deliveryFee = subtotal >= threshold ? 0 : fee;
      const calculatedTotal = parseFloat((subtotal + deliveryFee).toFixed(2));

      if (Math.abs(calculatedTotal - parseFloat(total)) > 0.20) {
        throw new Error(`Price Mismatch: Calc $${calculatedTotal} vs Sent $${total}`);
      }

      const { customAlphabet } = require('nanoid');
      const orderCode = `MO-${customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8)()}`;

      // 4. KHQR Generation (🛡️ Outside Transaction: No DB locks!)
      let qrString = '';
      const bakongId = process.env.MERCHANT_BAKONG_ID || dbSettings.bakong_account_id;
      const merchantName = process.env.BAKONG_MERCHANT_NAME || dbSettings.bakong_merchant_name;
      
      if (bakongId && bakongId.trim() !== '') {
        const optionalData = {
          amount: parseFloat(calculatedTotal.toFixed(2)),
          currency: khqrData.currency.usd,
          billNumber: orderCode,
          expirationTimestamp: Date.now() + 15 * 60 * 1000,
          merchantCategoryCode: '5999'
        };

        const individualInfo = new IndividualInfo(
          bakongId,
          merchantName || 'MO MO Boutique',
          'Phnom Penh',
          optionalData
        );

        const result = khqr.generateIndividual(individualInfo);

        if (result?.data && result.status.code === 0) {
          qrString = result.data.qr;
        }
      }

      // --- TRANSACTION START (Minimized Duration) ---
      await client.query('BEGIN');
      
      const updatedProducts = await productRepository.deductStockBatch(
        items.map(i => ({ id: i.id, quantity: parseInt(i.quantity) })), 
        client
      );

      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      const order = await orderRepository.create({
        user_id: userId,
        user_name: userName || 'Guest',
        items: JSON.stringify(items),
        total: calculatedTotal,
        subtotal: subtotal,
        discount_amount: totalItemDiscount + bundleBonus,
        delivery_fee: deliveryFee,
        gross_total: grossTotal,
        qr_string: qrString,
        phone: deliveryInfo?.phone || '',
        address: deliveryInfo?.address || '',
        province: deliveryInfo?.province || 'Phnom Penh',
        note: deliveryInfo?.note || '',
        delivery_company: deliveryInfo?.deliveryCompany || 'J&T Express',
        payment_method: deliveryInfo?.paymentMethod || 'Bakong KHQR',
        order_code: orderCode,
        idempotency_key: idempotencyKey || null,
        expires_at: expiresAt
      }, client);

      await client.query('COMMIT');

      // 🚀 EDA: Parallel Background Processing
      QueueService.add('ORDER_POST_PROCESS', { order, items, deliveryInfo, updatedProducts, userId, calculatedTotal }, async (ctx) => {
        const { order, items, deliveryInfo, updatedProducts, userId, calculatedTotal } = ctx;
        
        await Promise.allSettled([
          // Digital Twin Sync
          (userId && deliveryInfo) ? userRepository.upsert(userId, deliveryInfo.phone, deliveryInfo.address) : Promise.resolve(),
          
          // Loyalty System
          (userId && calculatedTotal) ? userRepository.addLoyaltyPoints(userId, Math.floor(calculatedTotal)) : Promise.resolve(),
          
          // Parallel Inventory Notifications
          ...updatedProducts.map(p => 
            p.stock <= 5 ? notificationService.sendLowStockAlert(process.env.SUPERADMIN_ID, p) : Promise.resolve()
          )
        ]);

        // Watchdog: Start Auto-Verification
        const orderStatus = await orderRepository.findById(order.id).then(o => o.status);
        if (orderStatus === 'pending') {
          orderService.startPaymentWatcher(order, qrString).catch(console.error);
        }
      });

      // 🕒 Synchronous UI Hint: Ensure frontend knows this is fresh
      order.expires_in = 300;

      return { order };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async confirmOrderPayment(orderCode, tgUser, isReconciled = false) {
    const order = await orderRepository.findByCode(orderCode);
    if (!order) throw new Error('Order not found');
    
    // 🛡️ Principal: Admin-Bypass or Identity Verification
    if (tgUser.id !== 'SYSTEM' && String(tgUser.id) !== String(order.user_id)) {
       throw new Error('Access Denied');
    }
    
    // 🛡️ Idempotency: skip if already paid or final
    if (order.status !== 'pending') {
      console.log(`ℹ️ Order ${orderCode} already in state: ${order.status}. Skipping.`);
      return order;
    }

    const updated = await orderRepository.updateStatus(order.id, 'paid');
    if (!updated) return order;

    console.log(`✅ Payment Confirmed ${isReconciled ? '(RECONCILED)' : ''}: ${orderCode}`);
    
    // 🚀 EDA: Notify Admin and User
    if (isReconciled) {
      await notificationService.notifyReconciliationSuccess(process.env.SUPERADMIN_ID, order.user_id, updated).catch(console.error);
    } else {
      const items = JSON.parse(updated.items);
      await notificationService.notifyOrderPaid(process.env.SUPERADMIN_ID, order.user_id, updated, items).catch(console.error);
    }
    
    return updated;
  },
  async generateQR(order) {
    try {
      const bakongId = process.env.MERCHANT_BAKONG_ID || await settingsRepository.get('bakong_account_id');
      const merchantName = process.env.BAKONG_MERCHANT_NAME || await settingsRepository.get('bakong_merchant_name');

      if (bakongId && bakongId.trim() !== '') {
        const optionalData = {
          amount: parseFloat(order.total.toFixed(2)),
          currency: khqrData.currency.usd,
          billNumber: order.order_code,
          expirationTimestamp: Date.now() + 15 * 60 * 1000,
          merchantCategoryCode: '5999'
        };

        const individualInfo = new IndividualInfo(
          bakongId,
          merchantName || 'MO MO Boutique',
          'Phnom Penh',
          optionalData
        );

        const result = khqr.generateIndividual(individualInfo);

        if (result?.data && result.status.code === 0) {
          await orderRepository.updateQrString(order.id, result.data.qr);
        }
      }
    } catch (err) {
      console.error('🔴 EDA: QR Generation Fail:', err.message);
    }
  },

  async getOrderStatus(orderCode, tgUser) {
    const order = await orderRepository.findByCode(orderCode);
    if (!order) throw new Error('Order not found');
    
    // 🛡️ Access Control
    if (String(tgUser.id) !== String(order.user_id) && String(tgUser.id) !== String(process.env.SUPERADMIN_ID)) {
       throw new Error('Access Denied');
    }

    // 🛡️ SELF-HEALING: If pending, perform a one-time real-time Bakong check
    // This recovers from server restarts that might have killed the background watchdog.
    if (order.status === 'pending') {
      try {
        const result = await bakongService.checkTransaction(order.qr_string);
        if (result.success) {
          console.log(`✅ Healing: Payment detected during poll for ${orderCode}. Confirming...`);
          const confirmed = await this.confirmOrderPayment(orderCode, { id: 'SYSTEM' });
          if (confirmed) order = confirmed;
        } else if (result.isStale) {
          // 🛡️ Principal: ONLY regenerate if the order is genuinely old (> 15 mins)
          // to avoid losing a payment made on a "fresh" QR that Bakong is just being slow with.
          const now = Date.now();
          const createdAt = new Date(order.created_at).getTime();
          const ageMinutes = (now - createdAt) / (1000 * 60);

          if (ageMinutes > 15) {
            console.log(`♻️ Healing: Stale context detected for OLD order ${orderCode}. Regenerating QR...`);
            await this.generateQR(order);
            order = await orderRepository.findByCode(orderCode);
          } else {
            console.log(`⏳ Healing: Bakong returned 15 (Internal Error) for FRESH order ${orderCode}. Retrying same MD5...`);
          }
        }
      } catch (err) {
        console.warn(`📡 Healing check failed for ${orderCode}:`, err.message);
      }
    }

    // 🕒 Calculate dynamic server-side expiration using the explicit expires_at column
    // 🛡️ HARDENED: Handle potential Date object vs String from DB + Timezone resilience
    if (order.status === 'pending' && order.expires_at) {
      const expiresAt = new Date(order.expires_at).getTime();
      const now = Date.now();
      
      // Calculate remaining; if it's within a few seconds margin, don't flip to expired immediately
      const remaining = Math.floor((expiresAt - now) / 1000);
      order.expires_in = Math.max(0, remaining);

      console.log(`🕒 Status Poll [${orderCode}]: ExpAt: ${new Date(expiresAt).toISOString()}, Now: ${new Date(now).toISOString()}, Remaining: ${order.expires_in}s`);
    } else if (order.status === 'paid') {
      order.expires_in = 0; // Already paid, timer not needed
    } else {
      // Fallback for other statuses to prevent flickering "Expired" if status isn't strictly 'pending' yet
      console.log(`⚠️ Status Poll [${orderCode}]: Status ${order.status} is not pending. Defaulting to 300s.`);
      order.expires_in = 300; 
    }

    return order;
  },

  async getUserOrders(userId, limit, offset, tgUser) {
    if (String(tgUser.id) !== String(userId)) throw new Error('Access Denied');
    return {
      orders: await orderRepository.findByUserPaginated(userId, limit, offset),
      total: await orderRepository.countByUser(userId)
    };
  },

  /**
   * 🛡️ MO-MO Payment Watchdog
   * Automatic polling to detect Bakong payments without user interaction.
   * Runs for max 10 minutes or until success.
   */
  async startPaymentWatcher(order, qrString, attempt = 1) {
    const MAX_ATTEMPTS = 200; // 200 * 3s = 10 minutes
    const INTERVAL_MS = 3000; // 3 seconds (Aggressive background polling)

    if (attempt === 1) {
      console.log(`🔍 Watchdog: Checking Bakong for Order ${order.order_code}...`);
    }

    if (attempt > MAX_ATTEMPTS) {
      console.log(`⏳ Watchdog: Timeout for Order ${order.order_code}`);
      return;
    }

    try {
      // 1. Double check current status from DB
      const current = await orderRepository.findById(order.id);
      if (!current || current.status !== 'pending') {
        console.log(`ℹ️ Watchdog: Order ${order.order_code} is no longer pending. Exiting loop.`);
        return;
      }

      // 2. Call Bakong API
      const result = await bakongService.checkTransaction(qrString);

      if (result.success) {
        console.log(`✅ Watchdog: Payment CONFIRMED for ${order.order_code}`);
        await this.confirmOrderPayment(order.order_code, { id: 'SYSTEM' });
        return;
      }

      // 3. Retry if not yet paid
      setTimeout(() => {
        this.startPaymentWatcher(order, qrString, attempt + 1).catch(console.error);
      }, INTERVAL_MS);

    } catch (err) {
      console.error(`🔴 Watchdog Error [${order.order_code}]:`, err.message);
      setTimeout(() => {
        this.startPaymentWatcher(order, qrString, attempt + 1).catch(console.error);
      }, INTERVAL_MS);
    }
  },

  /**
   * 🔄 Global Reconciliation Loop
   * Scans all pending orders from the last 24h and forces a Bakong check.
   */
  async reconcileAllPending() {
    console.log('🔄 Reconciler: Starting global scan for pending orders...');
    try {
      const pendingOrders = await orderRepository.findPendingOrders(24);
      console.log(`🔄 Reconciler: Found ${pendingOrders.length} pending orders to verify.`);

      for (const order of pendingOrders) {
        try {
          const result = await bakongService.checkTransaction(order.qr_string);
          if (result.success) {
            console.log(`✅ Reconciler: Found late payment for ${order.order_code}. Confirming...`);
            await this.confirmOrderPayment(order.order_code, { id: 'SYSTEM' }, true);
          }
        } catch (itemErr) {
          console.warn(`⚠️ Reconciler: Failed to check ${order.order_code}:`, itemErr.message);
        }
      }
      console.log('🔄 Reconciler: Global scan completed.');
    } catch (err) {
      console.error('🔴 Reconciler: Global scan failed:', err.message);
    }
  }
};

module.exports = orderService;
