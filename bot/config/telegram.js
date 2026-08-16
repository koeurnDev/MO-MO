const { Telegraf, Markup } = require('telegraf');
const pool = require('./database');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { formatFullAddress } = require('../utils/deliveryUtils');

if (!process.env.BOT_TOKEN) {
  console.error('🔴 BOT_TOKEN is missing. Bot cannot start.');
  process.exit(1);
}

// 🛡️ Markdown V1 Escape Helper — prevents 400 Bad Request on dynamic user names
const escapeMarkdown = (text) => {
  if (!text && text !== 0) return '';
  return String(text).replace(/([_*`\[])/g, '\\$1');
};

// 🔒 Shared RBAC authorization check for Telegram inline actions
const isAuthorizedAdmin = async (telegramUserId) => {
  if (String(telegramUserId) === String(process.env.SUPERADMIN_ID)) return true;
  const userRepository = require('../repositories/userRepository');
  const dbUser = await userRepository.findById(String(telegramUserId));
  return dbUser && (dbUser.role === 'admin' || dbUser.role === 'staff');
};

const telegrafOptions = {};
if (process.env.PROXY_URL) {
  telegrafOptions.telegram = {
    agent: new HttpsProxyAgent(process.env.PROXY_URL)
  };
  console.log(`🔌 Using Proxy for Telegram Bot: ${process.env.PROXY_URL}`);
}

const bot = new Telegraf(process.env.BOT_TOKEN, telegrafOptions);

// --- Core Bot logic ---

// 1. Start Command
bot.start((ctx) => {
  ctx.reply(`សួស្តី ${escapeMarkdown(ctx.from.first_name)}! សូមស្វាគមន៍មកកាន់ MARUN MINI STORE 🛍️\n\nសូមចុចប៊ូតុងខាងក្រោមដើម្បីចូលមើលទំនិញថ្មីៗ`, 
    Markup.inlineKeyboard([
      [Markup.button.webApp('Shop Now 🛍️', process.env.WEBAPP_URL)],
      [Markup.button.callback('មើលការកម្ម៉ង់ / Orders 📦', 'view_orders')]
    ])
  );
});

const statusMapText = {
  'paid': 'បានបង់ប្រាក់រួចរាល់ ✅',
  'processing': 'កំពុងរៀបចំអីវ៉ាន់ 📦',
  'shipped': 'ប្រគល់ជូនអ្នកដឹកជញ្ជូន 🚚',
  'delivered': 'បានដល់ដៃអតិថិជន 🎉',
  'cancelled': 'បានបោះបង់ ❌',
  'pending': 'រង់ចាំការបង់ប្រាក់ ⏳'
};

const sendOrderHistory = async (ctx) => {
  try {
    const userId = ctx.from.id.toString();
    const orders = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
      [userId]
    );

    if (orders.rows.length === 0) {
      return ctx.reply('បងមិនទាន់មានការកុម្ម៉ង់នៅឡើយទេបាទ។ 🛍️');
    }

    let msg = '📦 *ការកម្ម៉ង់ ៥ ចុងក្រោយរបស់បង៖*\n\n';
    const inlineButtons = [];

    orders.rows.forEach((o, index) => {
      const date = new Date(o.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh', hour12: true });
      const statusText = statusMapText[o.status] || o.status;
      const displayCode = o.order_code || o.id;
      const displayCodeEscaped = escapeMarkdown(displayCode);

      msg += `${index + 1}️⃣ 🆔 *\`${displayCodeEscaped}\`*\n`;
      msg += `   📌 ស្ថានភាព: *${statusText}*\n`;
      msg += `   💰 តម្លៃសរុប: *$${parseFloat(o.total || 0).toFixed(2)}*\n`;
      if (o.tracking_number) {
        msg += `   🚚 Tracking: \`${escapeMarkdown(o.tracking_number)}\`\n`;
      }
      msg += `   🕒 ថ្ងៃទី: ${date}\n\n`;

      inlineButtons.push([
        Markup.button.callback(`🔍 ឆែក #${displayCode.slice(-6)} (${statusText})`, `track_order_${displayCode}`)
      ]);
    });

    msg += '👇 ចុចប៊ូតុងខាងក្រោមដើម្បីឆែកមើលព័ត៌មានលម្អិត៖';

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(inlineButtons)
    });
  } catch (err) {
    console.error('🔴 Bot Orders Error:', err.message);
    await ctx.reply('សុំទោស! មានបញ្ហាក្នុងការទាញយកទិន្នន័យ។');
  }
};

// 2. Order History Command & Actions
bot.command('orders', sendOrderHistory);
bot.action('view_orders', sendOrderHistory);

// 🔍 Track Specific Order Action
bot.action(/^track_order_(.+)$/, async (ctx) => {
  try {
    const orderCode = ctx.match[1];
    const telegramUserId = ctx.from.id.toString();

    const orders = await pool.query(
      'SELECT * FROM orders WHERE (order_code = $1 OR id::text = $1) AND user_id = $2',
      [orderCode, telegramUserId]
    );

    if (orders.rows.length === 0) {
      return ctx.answerCbQuery('រកមិនឃើញទិន្នន័យការកម្ម៉ង់នេះទេ ❌', { show_alert: true });
    }

    const order = orders.rows[0];
    const statusText = statusMapText[order.status] || order.status;
    const displayCode = escapeMarkdown(order.order_code || order.id);
    const dateStr = new Date(order.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh', hour12: true });

    let itemsText = '';
    try {
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
      itemsText = items.map(it => `• ${escapeMarkdown(it.name || it.product_name || 'ទំនិញ')} x${it.quantity || 1} ($${((it.price || 0) * (it.quantity || 1)).toFixed(2)})`).join('\n');
    } catch (e) {}

    let detailMsg = `🔍 *ព័ត៌មានលម្អិតអំពីការកម្ម៉ង់*\n\n`;
    detailMsg += `🆔 លេខសម្គាល់៖ \`${displayCode}\`\n`;
    if (order.user_name) {
      detailMsg += `👤 អតិថិជន៖ *${escapeMarkdown(order.user_name)}*\n`;
    }
    detailMsg += `📌 ស្ថានភាព៖ *${statusText}*\n`;
    if (order.tracking_number) {
      detailMsg += `🚚 លេខ Tracking ៖ \`${escapeMarkdown(order.tracking_number)}\`\n`;
    }
    detailMsg += `🕒 ថ្ងៃទីកម្ម៉ង់៖ ${dateStr}\n\n`;

    if (itemsText) {
      detailMsg += `🛍️ *ទំនិញដែលបានទិញ៖*\n${itemsText}\n\n`;
    }

    if (order.subtotal && Number(order.subtotal) > 0) {
      detailMsg += `💵 តម្លៃទំនិញ៖ $${parseFloat(order.subtotal).toFixed(2)}\n`;
    }
    if (order.discount_amount && Number(order.discount_amount) > 0) {
      detailMsg += `🎟️ បញ្ចុះតម្លៃ៖ -$${parseFloat(order.discount_amount).toFixed(2)}\n`;
    }
    if (order.delivery_fee !== undefined && order.delivery_fee !== null) {
      const feeVal = Number(order.delivery_fee);
      detailMsg += `🚚 ថ្លៃដឹកជញ្ជូន៖ ${feeVal === 0 ? 'ឥតគិតថ្លៃ 🎁' : `$${feeVal.toFixed(2)}`}\n`;
    }
    detailMsg += `💰 *តម្លៃសរុប៖* *$${parseFloat(order.total || 0).toFixed(2)}*\n`;

    if (order.payment_method) {
      detailMsg += `💳 *វិធីសាស្ត្របង់ប្រាក់៖* ${escapeMarkdown(order.payment_method)}\n`;
    }

    detailMsg += `\n`;
    if (order.phone) {
      detailMsg += `📞 *លេខទូរស័ព្ទ៖* \`${escapeMarkdown(order.phone)}\`\n`;
    }
    const fullAddress = formatFullAddress(order.address, order.province);
    if (fullAddress) {
      detailMsg += `📍 *អាសយដ្ឋាន៖* ${fullAddress}\n`;
    }
    if (order.delivery_company) {
      detailMsg += `🚚 *ក្រុមហ៊ុនដឹកជញ្ជូន៖* ${escapeMarkdown(order.delivery_company)}\n`;
    }
    if (order.note) {
      detailMsg += `📝 *ចំណាំ៖* ${escapeMarkdown(order.note)}\n`;
    }

    const buttons = [];
    if (process.env.WEBAPP_URL) {
      buttons.push([Markup.button.webApp('🛍️ បើកមើលក្នុងហាង (Open App)', process.env.WEBAPP_URL)]);
    }

    await ctx.reply(detailMsg, {
      parse_mode: 'Markdown',
      ...(buttons.length > 0 ? Markup.inlineKeyboard(buttons) : {})
    });
    await ctx.answerCbQuery();
  } catch (err) {
    console.error('Track Order Error:', err.message);
    await ctx.answerCbQuery('មានបញ្ហាក្នុងការទាញយកទិន្នន័យ', { show_alert: true });
  }
});

// 3. Approve Order (Admin Inline Action)
bot.action(/^approve_order_(.+)$/, async (ctx) => {
  try {
    const orderCode = ctx.match[1];
    const telegramUserId = ctx.from.id.toString();

    // 🛡️ RBAC check — mirrors reject_order authorization logic
    const authorized = await isAuthorizedAdmin(telegramUserId);
    if (!authorized) {
      return ctx.answerCbQuery('❌ Access Denied: Admin Only', { show_alert: true });
    }

    const orderService = require('../services/orderService');
    await orderService.confirmOrderPayment(orderCode, { id: telegramUserId }, false);
    
    const msg = ctx.update.callback_query.message;
    const safeName = escapeMarkdown(ctx.from.first_name);
    const appendText = `\n\n✅ អនុម័តដោយ: ${safeName}`;
    
    if (msg.photo || msg.caption !== undefined) {
      await ctx.editMessageCaption(`${msg.caption || ''}${appendText}`);
    } else if (msg.text) {
      await ctx.editMessageText(`${msg.text}${appendText}`);
    }
    
    await ctx.answerCbQuery('Approved Successfully!');
  } catch (err) {
    console.error('Approve Error:', err.message);
    await ctx.answerCbQuery(`Error: ${err.message}`, { show_alert: true });
  }
});

// 4. Reject Order (Admin Inline Action)
bot.action(/^reject_order_(.+)$/, async (ctx) => {
  try {
    const orderCode = ctx.match[1];
    const telegramUserId = String(ctx.from.id);

    // 🛡️ RBAC check
    const authorized = await isAuthorizedAdmin(telegramUserId);
    if (!authorized) {
      return ctx.answerCbQuery('❌ Access Denied: Admin Only', { show_alert: true });
    }

    const res = await pool.query(
      'UPDATE orders SET status = $1 WHERE order_code = $2 RETURNING user_id',
      ['cancelled', orderCode]
    );
    
    if (res.rowCount > 0) {
      const userId = res.rows[0].user_id;
      const safeCode = escapeMarkdown(orderCode);
      const userMsg = `❌ *វិក្កយបត្ររបស់អ្នកត្រូវបានបដិសេធ*\n` +
                      `🆔 លេខសម្គាល់: \`${safeCode}\`\n` +
                      `សូមពិនិត្យមើលវាឡើងវិញ ឬទាក់ទងមកកាន់យើងខ្ញុំ។`;
      if (userId) {
        await ctx.telegram.sendMessage(String(userId), userMsg, { parse_mode: 'Markdown' }).catch(console.error);
      }
    }
    
    const msg = ctx.update.callback_query.message;
    const safeName = escapeMarkdown(ctx.from.first_name);
    const appendText = `\n\n❌ បដិសេធដោយ: ${safeName}`;
    
    if (msg.photo || msg.caption !== undefined) {
      await ctx.editMessageCaption(`${msg.caption || ''}${appendText}`);
    } else if (msg.text) {
      await ctx.editMessageText(`${msg.text}${appendText}`);
    }
    
    await ctx.answerCbQuery('Rejected Successfully!');
  } catch (err) {
    console.error('Reject Error:', err.message);
    await ctx.answerCbQuery(`Error: ${err.message}`, { show_alert: true });
  }
});

// 5. Global Bot Error Handler
bot.catch((err, ctx) => {
  console.error(`🔴 Bot Error for ${ctx.updateType}:`, err.message || err);
});

module.exports = bot;
