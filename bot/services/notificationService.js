const Queue = require('bull');
const bot = require('../config/telegram');

// ✅ Initialize notification queue (Redis connection)
const notificationQueue = new Queue('notifications', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// ✅ Queue processor: Handle Telegram notifications in the background
notificationQueue.process(async (job) => {
  const { type, adminId, userId, order, items } = job.data;
  try {
    if (bot) {
      const itemsList = (items || []).map(it => `- ${it.name} x ${it.quantity}`).join('\n');
      
      if (type === 'order_created') {
        const ticket = `🛒 *ការកម្ម៉ង់ថ្មី (New Order)*\n` +
                      `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                      `👤 អតិថិជន: *${order.user_name}*\n` +
                      `📝 ទំនិញ:\n${itemsList}\n\n` +
                      `💰 សរុប: *$${order.total}*`;
        await bot.telegram.sendMessage(adminId, ticket, { parse_mode: 'Markdown' });
        
        const userTicket = `🛒 *ការកម្ម៉ង់របស់អ្នកត្រូវបានទទួល!*\n` +
                          `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                          `💰 សរុប: *$${order.total}*`;
        await bot.telegram.sendMessage(userId, userTicket, { parse_mode: 'Markdown' });
      } else if (type === 'order_paid') {
        const ticket = `🎫 *វិក្កយបត្រកម្មង់ដែលបានបង់ប្រាក់*\n` +
                       `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                       `👤 អតិថិជន: *${order.user_name}*\n` +
                       `📦 ទំនិញ:\n${itemsList}\n` +
                       `💰 សរុប: *$${order.total}*`;
        await bot.telegram.sendMessage(adminId, ticket, { parse_mode: 'Markdown' });

        const userTicket = `✨ *វិក្កយបត្រកម្មង់ដែលបានបង់ប្រាក់*\n` +
                          `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                          `✅ ការបង់ប្រាក់ត្រូវបានបញ្ជាក់ជោគជ័យ! អរគុណសម្រាប់ការគាំទ្រពី MO MO Boutique។`;
        await bot.telegram.sendMessage(userId, userTicket, { parse_mode: 'Markdown' });
      } else if (type === 'reconciliation_success') {
        const ticket = `🔄 *ការផ្ទៀងផ្ទាត់ឡើងវិញបានជោគជ័យ (Reconciled)*\n` +
                       `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                       `👤 អតិថិជន: *${order.user_name}*\n` +
                       `✅ ប្រព័ន្ធបានឆែកឃើញការបង់ប្រាក់ដែលបាត់ដានកាលពីមុន។ អ័រឌឺត្រូវបានបញ្ជាក់ដោយស្វ័យប្រវត្តិ!`;
        await bot.telegram.sendMessage(adminId, ticket, { parse_mode: 'Markdown' });

        const userTicket = `✨ *ការបង់ប្រាក់របស់អ្នកត្រូវបានបញ្ជាក់ (Reconciled)*\n` +
                          `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                          `✅ ប្រព័ន្ធបានឆែកឃើញការបង់ប្រាក់របស់អ្នក។ អរគុណដែលបានរង់ចាំ!`;
        await bot.telegram.sendMessage(userId, userTicket, { parse_mode: 'Markdown' });
      }
    }
  } catch (e) {
    console.error('🔴 Notification Worker Fail:', e.message);
    throw e;
  }
});

const notificationService = {
  notifyOrderCreated: (adminId, userId, order, items) => {
    return notificationQueue.add({
      type: 'order_created', adminId, userId, order, items
    }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
  },

  notifyOrderPaid: (adminId, userId, order, items) => {
    return notificationQueue.add({
      type: 'order_paid', adminId, userId, order, items
    }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
  },

  sendLowStockAlert: async (adminId, product) => {
    if (!bot || !adminId) return;
    const msg = `⚠️ *LOW STOCK ALERT*\n\n` +
                `📦 ទំនិញ: *${product.name}*\n` +
                `📉 ចំនួននៅសល់: *${product.stock}* គ្រឿង\n\n` +
                `សូមប្រញាប់បន្ថែមស្តុកបាទ!`;
    await bot.telegram.sendMessage(adminId, msg, { parse_mode: 'Markdown' });
  },

  notifyReconciliationSuccess: (adminId, userId, order) => {
    return notificationQueue.add({
      type: 'reconciliation_success', adminId, userId, order
    }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
  }
};

module.exports = notificationService;
