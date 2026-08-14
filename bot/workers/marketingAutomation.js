const orderRepository = require('../repositories/orderRepository');
const orderService = require('../services/orderService');
const bakongService = require('../services/bakongService');
const cacheService = require('../services/cacheService');
const bot = require('../config/telegram');

const escapeMarkdown = (text) => {
  if (!text && text !== 0) return '';
  return String(text).replace(/([_*`\[])/g, '\\$1');
};

const marketingAutomation = {
  timer: null,
  isProcessing: false,
  intervalMs: 3600000, // 1 hour

  start: () => {
    if (process.env.ENABLE_PAYMENT_REMINDERS !== 'true') {
      console.log('ℹ️ [Marketing Automation] Payment reminders disabled (manual admin review). Set ENABLE_PAYMENT_REMINDERS=true to enable.');
      return;
    }
    if (marketingAutomation.timer) return;
    console.log('🚀 [Marketing Automation] Background worker started (Distributed & Safe)');

    // Run initial scan after 45s, then every hour
    setTimeout(() => marketingAutomation.run(), 45000);
    marketingAutomation.timer = setInterval(() => marketingAutomation.run(), marketingAutomation.intervalMs);
  },

  run: async () => {
    if (marketingAutomation.isProcessing) {
      console.log('⏳ [Marketing Automation] Cycle in progress. Skipping...');
      return;
    }

    // 🛡️ Distributed Locking: Ensure only 1 worker instance runs across multi-container pods
    const lockKey = 'lock:worker:marketing_automation';
    const lockAcquired = await cacheService.set(lockKey, 'locked', 1800); // 30 min lock TTL
    if (!lockAcquired) {
      console.log('🔒 [Marketing Automation] Lock held by another instance. Skipping...');
      return;
    }

    marketingAutomation.isProcessing = true;
    try {
      console.log('🔄 [Marketing Automation] Scanning for abandoned unpaid checkouts...');
      const abandonedOrders = await orderRepository.findAbandonedUnpaidOrders(24, 4);

      if (abandonedOrders.length === 0) {
        console.log('✅ [Marketing Automation] No abandoned carts found.');
        return;
      }

      console.log(`📦 [Marketing Automation] Found ${abandonedOrders.length} abandoned orders. Processing...`);

      for (const order of abandonedOrders) {
        try {
          // Skip if customer already submitted payment proof (admin still reviewing)
          if (order.receipt_url) {
            await orderRepository.markAsReminded(order.id);
            continue;
          }

          // Auto-confirm if Bakong already received payment — never ask customer to pay again
          if (order.qr_string) {
            const tx = await bakongService.checkTransaction(order.qr_string);
            if (tx.success) {
              console.log(`✅ [Marketing Automation] Bakong payment found for ${order.order_code}. Confirming instead of reminding.`);
              await orderService.confirmOrderPayment(order.order_code, { id: 'SYSTEM' }, true);
              continue;
            }
          }

          const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
          let itemsDescription = '';
          
          if (Array.isArray(items)) {
            itemsDescription = items.map(item => `🔹 ${escapeMarkdown(item.name)} (x${item.quantity})`).join('\n');
          }

          const safeCode = escapeMarkdown(order.order_code || order.id);
          const safeTotal = parseFloat(order.total || 0).toFixed(2);

          const message = `⚠️ សួស្តី! ការកម្ម៉ង់របស់អ្នកមិនទាន់បានបង់ប្រាក់នៅឡើយទេ។\n\n` +
                          `📦 *លេខវិក្កយបត្រ:* \`${safeCode}\`\n` +
                          `🛍️ *ទំនិញដែលបានកម្ម៉ង់:*\n${itemsDescription}\n` +
                          `💰 *សរុប:* $${safeTotal}\n\n` +
                          `សូមធ្វើការបង់ប្រាក់ឥឡូវនេះ ដើម្បីឱ្យយើងរៀបចំអីវ៉ាន់ជូនអ្នក! 🙏`;

          if (bot && bot.telegram) {
            await bot.telegram.sendMessage(order.user_id, message, { parse_mode: 'Markdown' });
          }

          await orderRepository.markAsReminded(order.id);
          console.log(`✅ [Marketing Automation] Sent reminder for order ${order.order_code || order.id}`);

          await new Promise(r => setTimeout(r, 200)); // Non-blocking 200ms throttle
        } catch (msgErr) {
          console.error(`⚠️ [Marketing Automation] Failed to send to ${order.user_id}:`, msgErr.message);
        }
      }
    } catch (err) {
      console.error('🔴 [Marketing Automation] Error during cycle:', err.message);
    } finally {
      marketingAutomation.isProcessing = false;
      await cacheService.delete(lockKey).catch(() => {});
    }
  },

  stop: () => {
    if (marketingAutomation.timer) {
      clearInterval(marketingAutomation.timer);
      marketingAutomation.timer = null;
      console.log('🛑 [Marketing Automation] Worker stopped.');
    }
  }
};

module.exports = marketingAutomation;
