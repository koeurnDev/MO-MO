const orderRepository = require('../repositories/orderRepository');
const productRepository = require('../repositories/productRepository');
const couponRepository = require('../repositories/couponRepository');
const settingsRepository = require('../repositories/settingsRepository');
const userRepository = require('../repositories/userRepository');
const notificationService = require('./notificationService');
const QueueService = require('./QueueService');
const pool = require('../config/database');
const { calculateBestDiscount, getDiscountedPrice } = require('../utils/discountUtils');

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
      
      if (String(tgUser.id) !== String(userId)) throw new Error('Identity Mismatch');

      const shopStatus = await settingsRepository.get('shop_status');
      if (shopStatus === 'closed') throw new Error('Shop closed');

      await client.query('BEGIN');

      // 1. Idempotency Guard
      if (idempotencyKey) {
        const existing = await orderRepository.findByIdempotencyKey(userId, idempotencyKey);
        if (existing) {
          await client.query('ROLLBACK');
          return { order: existing, cached: true };
        }
      }

      // 2. Data Retrieval
      const itemIds = items.map(i => i.id);
      const [dbProducts, activeDiscounts, dbSettings] = await Promise.all([
        productRepository.findByIds(itemIds),
        couponRepository.findActiveAuto(),
        settingsRepository.getByKeys(['delivery_threshold', 'delivery_fee'])
      ]);

      // 3. Price Verification (Principal Logic preserved)
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

      // 4. Atomic Multi-Operation
      const updatedProducts = await productRepository.deductStockBatch(items.map(i => ({ id: i.id, quantity: parseInt(i.quantity) })), client);
      
      const { customAlphabet } = require('nanoid');
      const orderCode = `MO-${customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8)()}`;
      
      const order = await orderRepository.create({
        user_id: userId,
        user_name: userName || 'Guest',
        items: JSON.stringify(items),
        total: calculatedTotal,
        phone: deliveryInfo?.phone || '',
        address: deliveryInfo?.address || '',
        province: deliveryInfo?.province || 'Phnom Penh',
        note: deliveryInfo?.note || '',
        delivery_company: deliveryInfo?.deliveryCompany || 'J&T Express',
        payment_method: deliveryInfo?.paymentMethod || 'Bakong KHQR',
        order_code: orderCode,
        idempotency_key: idempotencyKey || null
      }, client);

      await client.query('COMMIT');

      // 🚀 EDA: Offload non-critical side effects to background queue
      QueueService.add('ORDER_POST_PROCESS', { order, items, deliveryInfo, updatedProducts, userId, calculatedTotal }, async (ctx) => {
        const { order, items, deliveryInfo, updatedProducts, userId, calculatedTotal } = ctx;
        
        // A. Digital Twin & Records
        if (userId && deliveryInfo) {
          await userRepository.upsert(userId, deliveryInfo.phone, deliveryInfo.address).catch(() => {});
          await userRepository.addLoyaltyPoints(userId, Math.floor(calculatedTotal)).catch(() => {});
        }

        // B. Reliability: Low Stock Notifications
        for (const p of updatedProducts) {
          if (p.stock <= 5) {
            await notificationService.sendLowStockAlert(process.env.SUPERADMIN_ID, p).catch(() => {});
          }
        }

        // C. Customer Gratification
        await this.generateQR(order).catch(console.error);
        // 🛡️ Principal: Admin notification deferred until payment confirmation
      });

      return { order };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async confirmOrderPayment(orderCode, tgUser) {
    const order = await orderRepository.findByCode(orderCode);
    if (!order) throw new Error('Order not found');
    if (String(tgUser.id) !== String(order.user_id)) throw new Error('Access Denied');
    
    // Only proceed if still pending
    if (order.status !== 'pending') return order;

    const updated = await orderRepository.updateStatus(order.id, 'paid');
    
    // 🚀 EDA: Notify Admin only after payment confirmed
    const items = JSON.parse(updated.items);
    await notificationService.notifyOrderCreated(process.env.SUPERADMIN_ID, order.user_id, updated, items).catch(console.error);
    
    return updated;
  },

  async generateQR(order) {
    try {
      const bakongId = process.env.MERCHANT_BAKONG_ID || await settingsRepository.get('bakong_account_id');
      const merchantName = process.env.BAKONG_MERCHANT_NAME || await settingsRepository.get('bakong_merchant_name');
      const { KHQR, TAG, CURRENCY, COUNTRY } = require('ts-khqr');
      const qrResult = KHQR.generate({
        tag: TAG.INDIVIDUAL,
        accountID: bakongId,
        merchantName: merchantName,
        merchantCity: 'Phnom Penh',
        amount: String(order.total.toFixed(2)),
        currency: CURRENCY.USD,
        countryCode: COUNTRY.KH,
        expirationTimestamp: Date.now() + 15 * 60 * 1000, 
        additionalData: { billNumber: order.order_code }
      });

      if (qrResult?.data && qrResult.status.code === 0) {
        await orderRepository.updateQrString(order.id, qrResult.data.qr);
      }
    } catch (err) {
      console.error('🔴 EDA: QR Generation Fail:', err.message);
    }
  },

  async getOrderStatus(orderCode, tgUser) {
    const order = await orderRepository.findByCode(orderCode);
    if (!order) throw new Error('Order not found');
    if (String(tgUser.id) !== String(order.user_id)) throw new Error('Access Denied');
    return order;
  },

  async getUserOrders(userId, limit, offset, tgUser) {
    if (String(tgUser.id) !== String(userId)) throw new Error('Access Denied');
    return {
      orders: await orderRepository.findByUserPaginated(userId, limit, offset),
      total: await orderRepository.countByUser(userId)
    };
  }
};

module.exports = orderService;
