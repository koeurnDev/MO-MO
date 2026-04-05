const { Telegraf, Markup } = require('telegraf');

if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN is missing in environment variables.');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// 1. Start Command
bot.start((ctx) => {
  ctx.reply(`សួស្តី ${ctx.from.first_name}! សូមស្វាគមន៍មកកាន់ MO MO 🚀`, 
    Markup.inlineKeyboard([[Markup.button.webApp('Shop Now 🛍️', process.env.WEBAPP_URL)]])
  );
});

// 2. Error Handling
bot.catch((err, ctx) => {
  console.error(`Bot Error for ${ctx.updateType}:`, err);
});

module.exports = bot;
