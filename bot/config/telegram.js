const { Telegraf, Markup } = require('telegraf');
const pool = require('./database');

if (!process.env.BOT_TOKEN) {
  console.error('🔴 BOT_TOKEN is missing. Bot cannot start.');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- Core Bot logic (formerly in bot.js) ---

// 1. Start Command
bot.start((ctx) => {
  ctx.reply(`សួស្តី ${ctx.from.first_name}! សូមស្វាគមន៍មកកាន់ MO MO Boutique 🛍️\n\nសូមចុចប៊ូតុងខាងក្រោមដើម្បីចូលមើលទំនិញថ្មីៗបាទ៖`, 
    Markup.inlineKeyboard([
      [Markup.button.webApp('Shop Now 🛍️', process.env.WEBAPP_URL)],
      [Markup.button.callback('មើលការកម្ម៉ង់ / Orders 📦', 'view_orders')]
    ])
  );
});

// 2. Order History Command
bot.command('orders', async (ctx) => {
  try {
    const userId = ctx.from.id.toString();
    const orders = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [userId]);

    if (orders.rows.length === 0) {
      return ctx.reply('បងមិនទាន់មានការកុម្ម៉ង់នៅឡើយទេបាទ។ 🛍️');
    }

    let msg = '📦 *ការកម្ម៉ង់ ៥ ចុងក្រោយរបស់បង៖*\n\n';
    orders.rows.forEach(o => {
      const date = new Date(o.created_at).toLocaleDateString('km-KH');
      const statusIcon = o.status === 'paid' ? '✅' : o.status === 'shipped' ? '🚚' : o.status === 'processing' ? '📦' : o.status === 'pending' ? '⏳' : '❌';
      const statusText = o.status === 'paid' ? 'បានបង់ប្រាក់' : o.status === 'shipped' ? 'កំពុងដឹកជញ្ជូន' : o.status === 'processing' ? 'កំពុងរៀបចំ' : o.status === 'pending' ? 'រង់ចាំការបង់ប្រាក់' : 'បានលុប';
      
      msg += `${statusIcon} *#${(o.order_code || o.id).substring(0, 8)}*\n`;
      msg += `   ↳ ស្ថានភាព: ${statusText}\n`;
      msg += `   ↳ ថ្ងៃទី: ${date} | សរុប: $${o.total}\n\n`;
    });

    ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('🔴 Bot Command Error:', err.message);
    ctx.reply('សុំទោស! មានបញ្ហាក្នុងការទាញយកទិន្នន័យ។');
  }
});

bot.action('view_orders', (ctx) => ctx.reply('សូមវាយពាក្យ /orders ដើម្បីមើលប្រវត្តិរូបបងបាទ។'));

// 3. Error Handling
bot.catch((err, ctx) => {
  console.error(`🔴 Bot Error for ${ctx.updateType}:`, err);
});

module.exports = bot;
