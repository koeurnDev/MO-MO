const Queue = require('bull');
const bot = require('../config/telegram');
const { formatFullAddress } = require('../utils/deliveryUtils');

// 🛡️ Markdown V1 Escape Helper to prevent 400 Bad Request Telegram API crashes
const escapeMarkdown = (text) => {
  if (!text && text !== 0) return '';
  return String(text).replace(/([_*`\[])/g, '\\$1');
};

// ⚡ Reliable Bull Queue Initialization with clean TLS support
const getNotificationQueue = () => {
  if (process.env.REDIS_URL) {
    const isTls = process.env.REDIS_URL.startsWith('rediss://');
    return new Queue('notifications', process.env.REDIS_URL, isTls ? {
      redis: { tls: { rejectUnauthorized: false } }
    } : {});
  }
  return new Queue('notifications', { redis: { host: '127.0.0.1', port: 6379 } });
};

const notificationQueue = getNotificationQueue();

notificationQueue.on('error', (err) => {
  console.error('🔴 Notification Queue Error:', err.message || err);
});
notificationQueue.on('failed', (job, err) => {
  console.error(`❌ Notification Job Failed [${job.name}] id=${job.id}:`, err.message || err);
});

const safeSendTelegram = async (method, chatId, ...args) => {
  if (!bot || !bot.telegram) {
    throw new Error('Telegram bot not initialized');
  }
  const normalizedChatId = String(chatId);

  try {
    const result = await bot.telegram[method](normalizedChatId, ...args);
    console.log(`✅ Telegram ${method} success to ${normalizedChatId}`);
    return result;
  } catch (err) {
    console.error(`🔴 Telegram ${method} failed to ${normalizedChatId}:`, err.description || err.message || err);
    throw err;
  }
};

/**
 * 🚀 Single Source of Truth for Notification Formatting & Telegram Dispatching
 */
const sendTelegramNotification = async (type, adminId, userId, order, items = []) => {
  if (!bot) return;

  const itemsList = (items || []).map(it => `- ${escapeMarkdown(it.name)} x ${it.quantity}`).join('\n');
  const timeStr = new Date(order?.created_at || Date.now()).toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh', hour12: true });
  const safeOrderCode = escapeMarkdown(order?.order_code || order?.id);
  const safeUserName = escapeMarkdown(order?.user_name || 'អតិថិជន');
  const safeTotal = order?.total || '0';

  if (type === 'order_created') {
    const adminTicket = `🛒 *ការកម្ម៉ង់ថ្មី (New Order)*\n` +
      `🆔 លេខសម្គាល់: \`${safeOrderCode}\`\n` +
      `👤 អតិថិជន: *${safeUserName}*\n` +
      `📞 លេខទូរស័ព្ទ: \`${escapeMarkdown(order?.phone)}\`\n` +
      `📍 អាសយដ្ឋាន: ${escapeMarkdown(order?.address)}\n` +
      `🚚 ដឹកជញ្ជូន: *${escapeMarkdown(order?.delivery_company)}*\n` +
      `💳 បង់ប្រាក់: *${escapeMarkdown(order?.payment_method)}*\n` +
      `🛍️ ទំនិញ:\n${itemsList}\n` +
      `💰 សរុប: *$${safeTotal}*\n` +
      `🕒 កាលបរិច្ឆេទ: *${timeStr}*`;
    await safeSendTelegram('sendMessage', adminId, adminTicket, { parse_mode: 'Markdown' });

    if (userId) {
      const userTicket = `✅ *អរគុណសម្រាប់ការកម្ម៉ង់! (Order Received)*\n` +
        `🆔 លេខសម្គាល់: \`${safeOrderCode}\`\n` +
        `💰 ទឹកប្រាក់សរុប: *$${safeTotal}*\n` +
        `⏳ ប្រព័ន្ធកំពុងផ្ទៀងផ្ទាត់ការបង់ប្រាក់របស់អ្នក...`;
      await safeSendTelegram('sendMessage', userId, userTicket, { parse_mode: 'Markdown' });
    }

  } else if (type === 'order_paid') {
    const adminTicket = `💰 *ការបង់ប្រាក់បានបញ្ជាក់ (Payment Confirmed)*\n` +
      `🆔 លេខសម្គាល់: \`${safeOrderCode}\`\n` +
      `👤 អតិថិជន: *${safeUserName}*\n` +
      `💵 ចំនួនទឹកប្រាក់: *$${safeTotal}*\n` +
      `🕒 កាលបរិច្ឆេទ: *${timeStr}*`;
    await safeSendTelegram('sendMessage', adminId, adminTicket, { parse_mode: 'Markdown' });

    if (userId) {
      let itemListText = '';
      if (items && items.length > 0) {
        itemListText = items.map(it => `• ${escapeMarkdown(it.name || it.product_name || 'ទំនិញ')} x${it.quantity || 1} ($${((it.price || 0) * (it.quantity || 1)).toFixed(2)})`).join('\n');
      }

      let userTicket = `សួស្តីបង! ការកម្ម៉ង់របស់បងលេខសម្គាល់៖ \`${safeOrderCode}\`\n`;
      userTicket += `ការបរិច្ឆេទទិញ ${timeStr}\n\n`;
      if (itemListText) {
        userTicket += `🛍️ *ទំនិញដែលបានទិញ៖*\n${itemListText}\n\n`;
      }
      userTicket += `💰 *តម្លៃសរុប៖* $${safeTotal}\n`;

      if (order?.phone) {
        userTicket += `📞 *លេខទូរស័ព្ទ៖* \`${escapeMarkdown(order.phone)}\`\n`;
      }
      const fullAddr = formatFullAddress(order?.address, order?.province);
      if (fullAddr) {
        userTicket += `📍 *អាសយដ្ឋាន៖* ${escapeMarkdown(fullAddr)}\n`;
      }
      if (order?.note) {
        userTicket += `📝 *ចំណាំ៖* ${escapeMarkdown(order.note)}\n`;
      }

      userTicket += `\n📌 *ត្រូវបានប្តូរស្ថានភាពទៅជា៖*  *បានបង់ប្រាក់រួចរាល់ ✅*`;

      await safeSendTelegram('sendMessage', userId, userTicket, { parse_mode: 'Markdown' });
    }

  } else if (type === 'reconciliation_success') {
    const adminTicket = `🔄 *ការផ្ទៀងផ្ទាត់ឡើងវិញបានជោគជ័យ (Reconciled)*\n` +
      `🆔 លេខសម្គាល់: \`${safeOrderCode}\`\n` +
      `👤 អតិថិជន: *${safeUserName}*\n` +
      `✅ ប្រព័ន្ធបានឆែកឃើញការបង់ប្រាក់ដែលបាត់ដានកាលពីមុន។ អ័រឌឺត្រូវបានបញ្ជាក់ដោយស្វ័យប្រវត្តិ!`;
    await safeSendTelegram('sendMessage', adminId, adminTicket, { parse_mode: 'Markdown' });

    if (userId) {
      const userTicket = `✨ *ការបង់ប្រាក់របស់អ្នកត្រូវបានបញ្ជាក់ (Reconciled)*\n` +
        `🆔 លេខសម្គាល់: \`${safeOrderCode}\`\n` +
        `✅ ប្រព័ន្ធបានឆែកឃើញការបង់ប្រាក់របស់អ្នក។ អរគុណដែលបានរង់ចាំ!`;
      await safeSendTelegram('sendMessage', userId, userTicket, { parse_mode: 'Markdown' });
    }

  } else if (type === 'receipt_uploaded') {
    const adminTicket = `🧾 *វិក្កយបត្របានបញ្ជូនពីអតិថិជន*\n` +
      `🆔 លេខសម្គាល់: \`${safeOrderCode}\`\n` +
      `👤 អតិថិជន: *${safeUserName}*\n` +
      `💰 សរុប: *$${safeTotal}*\n` +
      `🕒 កាលបរិច្ឆេទ: *${timeStr}*\n\n` +
      `👇 សូមពិនិត្យរូបភាពវិក្កយបត្រខាងក្រោម ឬ ក្នុង Admin Dashboard។`;
    await safeSendTelegram('sendPhoto', adminId, order.receipt_url, {
      caption: adminTicket,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ អនុម័ត (Approve)', callback_data: `approve_order_${order.order_code}` }],
          [{ text: '❌ បដិសេធ (Reject)', callback_data: `reject_order_${order.order_code}` }]
        ]
      }
    });

    if (userId) {
      const userTicket = `✅ *បានទទួលរូបបង់ប្រាក់ (Receipt Received)*\n` +
        `🆔 លេខសម្គាល់: \`${safeOrderCode}\`\n` +
        `⏳ ក្រុមការងារកំពុងពិនិត្យ — សូមរង់ចាំការបញ្ជាក់។ មិនចាំបាច់បង់ម្តងទៀតទេ! 🙏`;
      await safeSendTelegram('sendMessage', userId, userTicket, { parse_mode: 'Markdown' });
    }

  } else if (type === 'broadcast') {
    const { userIds, message, photoUrl } = order || {};
    console.log(`📣 [Broadcast Queue Worker] Executing broadcast for ${(userIds || []).length} users...`);
    for (const uid of (userIds || [])) {
      if (!uid) continue;
      try {
        if (photoUrl) {
          await safeSendTelegram('sendPhoto', uid, photoUrl, { caption: message, parse_mode: 'Markdown' });
        } else {
          await safeSendTelegram('sendMessage', uid, message, { parse_mode: 'Markdown' });
        }
      } catch (e) {
        console.warn(`⚠️ [Broadcast Queue Worker] Skip ${uid}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 100)); // 100ms throttle between sends
    }
    console.log('✅ [Broadcast Queue Worker] Broadcast completed.');
  }
};

// ⚙️ Queue Worker: Single Responsibility - Delegates to sendTelegramNotification
notificationQueue.process(async (job) => {
  const { type, adminId, userId, order, items } = job.data;
  console.log(`ℹ️ Notification Worker: processing type=${type} adminId=${adminId} userId=${userId}`);
  await sendTelegramNotification(type, adminId, userId, order, items);
});

/**
 * 🚀 Write-Ahead Notification Service (Non-blocking HTTP execution)
 */
const notificationService = {
  notifyOrderCreated: async (adminId, userId, order, items) => {
    try {
      return await notificationQueue.add({
        type: 'order_created', adminId, userId, order, items
      }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    } catch (e) {
      console.warn('⚠️ Queue add failed, fallback to async direct send:', e.message);
      sendTelegramNotification('order_created', adminId, userId, order, items).catch(() => { });
    }
  },

  notifyOrderPaid: async (adminId, userId, order, items) => {
    try {
      return await notificationQueue.add({
        type: 'order_paid', adminId, userId, order, items
      }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    } catch (e) {
      console.warn('⚠️ Queue add failed, fallback to async direct send:', e.message);
      sendTelegramNotification('order_paid', adminId, userId, order, items).catch(() => { });
    }
  },

  sendLowStockAlert: async (adminId, product) => {
    if (!bot || !adminId) return;
    const safeProductName = escapeMarkdown(product?.name || 'ទំនិញ');
    const safeStock = product?.stock ?? 0;
    const msg = `⚠️ *LOW STOCK ALERT*\n\n` +
      `📦 ទំនិញ: *${safeProductName}*\n` +
      `📉 ចំនួននៅសល់: *${safeStock}* គ្រឿង\n\n` +
      `សូមប្រញាប់បន្ថែមស្តុកបាទ!`;
    safeSendTelegram('sendMessage', adminId, msg, { parse_mode: 'Markdown' }).catch(() => { });
  },

  notifyReconciliationSuccess: async (adminId, userId, order) => {
    try {
      return await notificationQueue.add({
        type: 'reconciliation_success', adminId, userId, order, items: []
      }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    } catch (e) {
      console.warn('⚠️ Queue add failed, fallback to async direct send:', e.message);
      sendTelegramNotification('reconciliation_success', adminId, userId, order, []).catch(() => { });
    }
  },

  sendReceiptToAdmin: async (adminId, order) => {
    try {
      return await notificationQueue.add({
        type: 'receipt_uploaded', adminId, userId: order?.user_id, order, items: []
      }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    } catch (e) {
      console.warn('⚠️ Queue add failed, fallback to async direct send:', e.message);
      sendTelegramNotification('receipt_uploaded', adminId, order?.user_id, order, []).catch(() => { });
    }
  },

  sendBroadcast: async (userIds, message, photoUrl) => {
    try {
      return await notificationQueue.add({
        type: 'broadcast', adminId: null, userId: null, order: { userIds, message, photoUrl }, items: []
      }, { attempts: 2, backoff: { type: 'exponential', delay: 5000 } });
    } catch (e) {
      console.warn('⚠️ Queue add failed for broadcast, fallback to async direct send:', e.message);
      sendTelegramNotification('broadcast', null, null, { userIds, message, photoUrl }).catch(() => { });
    }
  }
};

module.exports = notificationService;
