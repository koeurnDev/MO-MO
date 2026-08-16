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
const { calculateDeliveryFeeCents, toCents } = require('../utils/deliveryUtils');
const { BakongKHQR, IndividualInfo, khqrData } = require('bakong-khqr');
const khqr = new BakongKHQR();

// 🛡️ Cent-based Integer Financial Arithmetic Helpers
const fromCents = (cents) => Math.round(cents) / 100;

const orderService = {
  activeWatchers: 0,
  maxWatchers: 15,

  /**
   * Refactored for Elite Architect EDA:
   * Focuses strictly on ACID consistency and fast response.
   * Offloads side-effects to the Job Queue.
   */
  async createOrder(payload, tgUser) {
    const client = await pool.connect();
    try {
      const { userId, userName, items, total, deliveryInfo, idempotencyKey, couponCode } = payload;
      
      // 🛡️ Pre-Flight Health Check: Ensure Bakong is reachable and Token is valid 
      const health = await bakongService.checkHealth();
      if (!health.success) {
        console.warn('⚠️ Gateway Pre-flight Failed:', health.message);
        console.warn('⚠️ Bakong API is unreachable. Proceeding with static QR fallback.');
      }

      if (String(tgUser.id) !== String(userId)) {
        console.error(`🔴 Identity Mismatch: TG[${tgUser.id}] vs Payload[${userId}]`);
        throw new Error('Identity Mismatch');
      }

      const shopStatus = await settingsRepository.get('shop_status');
      if (shopStatus === 'closed') throw new Error('Shop closed');

      // 1. Idempotency Guard (Pre-check using cent-based financial comparison)
      if (idempotencyKey) {
        let existing = await orderRepository.findByIdempotencyKey(userId, idempotencyKey);
        if (existing && Math.abs(toCents(existing.total) - toCents(total)) <= 5) {
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
            existing = await orderRepository.findById(existing.id);
          }

          existing.expires_in = Math.max(0, Math.floor((new Date(existing.expires_at).getTime() - Date.now()) / 1000));
          return { order: existing, cached: true };
        }
      }

      // 2. Data Retrieval (Discounts & Settings)
      let manualCoupon = null;
      if (couponCode) {
        manualCoupon = await couponRepository.findByCode(couponCode);
      }

      const [activeDiscounts, dbSettings] = await Promise.all([
        couponRepository.findActiveAuto(),
        settingsRepository.getByKeys(['delivery_threshold', 'delivery_fee', 'bakong_account_id', 'bakong_merchant_name'])
      ]);

      // --- TRANSACTION START (Atomic SELECT FOR UPDATE & Stock Deduction) ---
      await client.query('BEGIN');

      // 🛡️ Atomic Stock Row-Locking (SELECT FOR UPDATE inside transaction)
      const deductionPayload = items.map(i => ({ id: i.id, quantity: parseInt(i.quantity) || 1, variant: i.variant }));
      const lockedProducts = await productRepository.deductStockBatch(deductionPayload, client);

      // 3. Price Verification (Cent-Based Integer Financial Arithmetic)
      let grossTotalCents = 0;
      let totalItemDiscountCents = 0;

      for (const cartItem of items) {
        const realProduct = lockedProducts.find(p => String(p.id) === String(cartItem.id));
        if (!realProduct) throw new Error('Invalid Product');

        const priceCents = toCents(realProduct.price);
        const qty = parseInt(cartItem.quantity) || 1;
        grossTotalCents += priceCents * qty;

        const best = calculateBestDiscount(realProduct, activeDiscounts);
        const discountedPrice = getDiscountedPrice(realProduct, best);
        const discountedPriceCents = toCents(discountedPrice);

        totalItemDiscountCents += (priceCents - discountedPriceCents) * qty;
      }

      let subtotalCents = Math.max(0, grossTotalCents - totalItemDiscountCents);
      
      // Apply Manual Coupon Discount (Order Level)
      if (manualCoupon) {
        const manualDiscountCents = manualCoupon.discount_type === 'percent' 
          ? Math.round(subtotalCents * (manualCoupon.value / 100))
          : toCents(manualCoupon.value);
        subtotalCents = Math.max(0, subtotalCents - manualDiscountCents);
        totalItemDiscountCents += manualDiscountCents;
      }

      const deliveryFeeCents = calculateDeliveryFeeCents(
        subtotalCents,
        dbSettings.delivery_fee,
        dbSettings.delivery_threshold
      );
      const calculatedTotalCents = subtotalCents + deliveryFeeCents;
      const calculatedTotal = fromCents(calculatedTotalCents);

      if (Math.abs(calculatedTotalCents - toCents(total)) > 20) {
        throw new Error(`Price Mismatch: Calc $${calculatedTotal} vs Sent $${total}`);
      }

      // 🏷️ Taobao-style 18-digit numeric Order ID: timestamp(13) + random(5)
      const orderCode = Date.now().toString() + Math.floor(Math.random() * 100000).toString().padStart(5, '0');

      // 🛡️ Increment coupon usage limit securely inside transaction
      if (manualCoupon) {
        await couponRepository.incrementUsage(manualCoupon.code, client);
      }

      // 4. KHQR Generation
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
          merchantName || 'MARUN MINI STORE',
          'Phnom Penh',
          optionalData
        );

        const result = khqr.generateIndividual(individualInfo);

        if (result?.data && result.status.code === 0) {
          qrString = result.data.qr;
        } else {
          console.error('🔴 KHQR Generation Failed:', result?.status?.message || 'Unknown error');
        }
      }

      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      const order = await orderRepository.create({
        user_id: userId,
        user_name: userName || 'Guest',
        items: JSON.stringify(items),
        total: calculatedTotal,
        subtotal: fromCents(subtotalCents),
        discount_amount: fromCents(totalItemDiscountCents),
        delivery_fee: fromCents(deliveryFeeCents),
        gross_total: fromCents(grossTotalCents),
        qr_string: qrString,
        phone: deliveryInfo?.phone || '',
        address: deliveryInfo?.address || '',
        province: deliveryInfo?.province || '',
        note: deliveryInfo?.note || '',
        delivery_company: deliveryInfo?.deliveryCompany || 'J&T Express',
        payment_method: deliveryInfo?.paymentMethod || 'Bakong KHQR',
        order_code: orderCode,
        idempotency_key: idempotencyKey || null,
        expires_at: expiresAt
      }, client);

      await client.query('COMMIT');

      // 🚀 Persistent Job Queue (Fire and forget to prevent hanging)
      QueueService.add('ORDER_POST_PROCESS', { orderId: order.id, items, deliveryInfo, userId, calculatedTotal }).catch(err => console.error('Queue Error:', err.message));

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
    
    const isSystem = String(tgUser.id) === 'SYSTEM';
    let isAdmin = String(tgUser.id) === String(process.env.SUPERADMIN_ID);
    
    if (!isSystem && !isAdmin) {
      const dbUser = await userRepository.findById(tgUser.id);
      if (dbUser && (dbUser.role === 'admin' || dbUser.role === 'staff')) {
        isAdmin = true;
      }
    }

    if (!isSystem && String(tgUser.id) !== String(order.user_id) && !isAdmin) {
       throw new Error('Access Denied');
    }
    
    if (order.status !== 'pending') {
      console.log(`ℹ️ Order ${orderCode} already in state: ${order.status}. Skipping.`);
      return order;
    }

    if (!isSystem && !isAdmin) {
      console.log(`🔒 Verifying payment for ${orderCode} via Bakong API...`);
      const result = await bakongService.checkTransaction(order.qr_string);
      if (!result.success) {
        throw new Error('Payment not yet received or verified by Bakong. Please wait a moment and try again.');
      }
    }

    const updated = await orderRepository.updateStatus(order.id, 'paid');
    if (!updated) return order;

    console.log(`✅ Payment Confirmed ${isReconciled ? '(RECONCILED)' : ''}: ${orderCode}`);
    
    if (isReconciled) {
      await notificationService.notifyReconciliationSuccess(process.env.SUPERADMIN_ID, order.user_id, updated).catch(console.error);
    } else {
      const items = JSON.parse(updated.items);
      await notificationService.notifyOrderPaid(process.env.SUPERADMIN_ID, order.user_id, updated, items).catch(console.error);
    }
    
    return updated;
  },

  async uploadReceipt(orderCode, receiptUrl, tgUser) {
    const order = await orderRepository.findByCode(orderCode);
    if (!order) throw new Error('Order not found');
    
    if (String(tgUser.id) !== String(order.user_id) && String(tgUser.id) !== String(process.env.SUPERADMIN_ID)) {
       throw new Error('Access Denied');
    }

    const updated = await orderRepository.updateReceiptUrl(order.id, receiptUrl);
    await notificationService.sendReceiptToAdmin(process.env.SUPERADMIN_ID, updated).catch(console.error);
    return updated;
  },

  async generateQR(order) {
    try {
      const bakongId = process.env.MERCHANT_BAKONG_ID || await settingsRepository.get('bakong_account_id');
      const merchantName = process.env.BAKONG_MERCHANT_NAME || await settingsRepository.get('bakong_merchant_name');

      if (bakongId && bakongId.trim() !== '') {
        const optionalData = {
          amount: parseFloat(Number(order.total).toFixed(2)),
          currency: khqrData.currency.usd,
          billNumber: order.order_code,
          expirationTimestamp: Date.now() + 15 * 60 * 1000,
          merchantCategoryCode: '5999'
        };

        const individualInfo = new IndividualInfo(
          bakongId,
          merchantName || 'MARUN MINI STORE',
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
    let order = await orderRepository.findByCode(orderCode);
    if (!order) throw new Error('Order not found');
    
    if (String(tgUser.id) !== String(order.user_id) && String(tgUser.id) !== String(process.env.SUPERADMIN_ID)) {
       throw new Error('Access Denied');
    }

    if (order.status === 'pending') {
      try {
        const result = await bakongService.checkTransaction(order.qr_string);
        if (result.success) {
          console.log(`✅ Healing: Payment detected during poll for ${orderCode}. Confirming...`);
          const confirmed = await this.confirmOrderPayment(orderCode, { id: 'SYSTEM' });
          if (confirmed) order = confirmed;
        } else if (result.isStale) {
          const now = Date.now();
          const createdAt = new Date(order.created_at).getTime();
          const ageMinutes = (now - createdAt) / (1000 * 60);

          if (ageMinutes > 15) {
            console.log(`♻️ Healing: Stale context detected for OLD order ${orderCode}. Regenerating QR...`);
            await this.generateQR(order);
            order = await orderRepository.findByCode(orderCode);
          }
        }
      } catch (err) {
        console.warn(`📡 Healing check failed for ${orderCode}:`, err.message);
      }
    }

    if (order.status === 'pending' && order.expires_at) {
      const expiresAt = new Date(order.expires_at).getTime();
      const now = Date.now();
      const remaining = Math.floor((expiresAt - now) / 1000);
      order.expires_in = Math.max(0, remaining);
    } else if (order.status === 'paid') {
      order.expires_in = 0;
    } else {
      order.expires_in = 300; 
    }

    return order;
  },

  async getUserOrders(userId, limit, offset, tgUser) {
    if (userId && String(tgUser?.id) !== String(userId)) throw new Error('Access Denied');
    const effectiveId = userId || tgUser?.id;
    return {
      orders: await orderRepository.findByUserPaginated(effectiveId, limit, offset),
      total: await orderRepository.countByUser(effectiveId)
    };
  },

  /**
   * 🛡️ MO-MO Payment Watchdog (Rate-Limit & Memory-Capped Exponential Backoff)
   */
  async startPaymentWatcher(order, qrString, attempt = 1) {
    const MAX_ATTEMPTS = 20; // 20 checks (~5 minutes with backoff)
    
    if (attempt === 1) {
      if (this.activeWatchers >= this.maxWatchers) {
        console.log(`ℹ️ Watchdog: Limit reached (${this.activeWatchers}). Global reconciler will verify ${order.order_code}.`);
        return;
      }
      this.activeWatchers++;
    }

    const getDelay = (att) => Math.min(5000 + att * 2000, 20000); // Backoff: 5s, 7s, 9s... max 20s

    if (attempt > MAX_ATTEMPTS) {
      console.log(`⏳ Watchdog: Timeout for Order ${order.order_code}`);
      this.activeWatchers = Math.max(0, this.activeWatchers - 1);
      return;
    }

    try {
      const current = await orderRepository.findById(order.id);
      if (!current || current.status !== 'pending') {
        this.activeWatchers = Math.max(0, this.activeWatchers - 1);
        return;
      }

      const result = await bakongService.checkTransaction(qrString);

      if (result.success) {
        console.log(`✅ Watchdog: Payment CONFIRMED for ${order.order_code}`);
        this.activeWatchers = Math.max(0, this.activeWatchers - 1);
        await this.confirmOrderPayment(order.order_code, { id: 'SYSTEM' });
        return;
      }

      setTimeout(() => {
        this.startPaymentWatcher(order, qrString, attempt + 1).catch(console.error);
      }, getDelay(attempt));

    } catch (err) {
      console.error(`🔴 Watchdog Error [${order.order_code}]:`, err.message);
      setTimeout(() => {
        this.startPaymentWatcher(order, qrString, attempt + 1).catch(console.error);
      }, getDelay(attempt));
    }
  },

  /**
   * 🔄 Global Reconciliation Loop (Paginated Batches to Protect Event Loop & Memory)
   */
  async reconcileAllPending(batchSize = 20) {
    console.log('🔄 Reconciler: Starting paginated scan for pending orders...');
    try {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const pendingOrders = await orderRepository.findPendingForReconciliation(48, batchSize, offset);
        if (!pendingOrders || pendingOrders.length === 0) {
          hasMore = false;
          break;
        }

        console.log(`🔄 Reconciler: Processing batch of ${pendingOrders.length} orders (offset ${offset})...`);

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
          await new Promise(r => setTimeout(r, 200)); // Rate limit pause per request
        }

        offset += pendingOrders.length;
        if (pendingOrders.length < batchSize) hasMore = false;
      }
      console.log('🔄 Reconciler: Global scan completed.');
    } catch (err) {
      console.error('🔴 Reconciler: Global scan failed:', err.message);
    }
  },

  /**
   * Statically defined processor for persistence
   */
  async _processOrderPostTasks(ctx) {
    const { orderId, items, deliveryInfo, userId, calculatedTotal } = ctx;
    
    const order = await orderRepository.findById(orderId);
    if (!order) return;

    await Promise.allSettled([
      (userId && deliveryInfo) ? userRepository.upsert(userId, deliveryInfo.phone, deliveryInfo.address) : Promise.resolve(),
      (userId && calculatedTotal) ? userRepository.addLoyaltyPoints(userId, Math.floor(calculatedTotal)) : Promise.resolve(),
      ...items.map(async (item) => {
        const p = await productRepository.findById(item.id);
        if (p && p.stock <= 5) {
          await notificationService.sendLowStockAlert(process.env.SUPERADMIN_ID, p).catch(() => {});
        }
      }),
      notificationService.notifyOrderCreated(process.env.SUPERADMIN_ID, userId, order, items)
    ]);

    if (order.status === 'pending' && order.qr_string) {
      orderService.startPaymentWatcher(order, order.qr_string).catch(console.error);
    }
  }
};

// 🛡️ Register persistent processor
QueueService.register('ORDER_POST_PROCESS', orderService._processOrderPostTasks.bind(orderService));

module.exports = orderService;
