const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const SUPERADMIN_ID = process.env.SUPERADMIN_ID;

const testMsg = `🛍 *ការបញ្ជាទិញថ្មី - NEW ORDER!* \n\n` +
                `🔢 *Order ID:* #TEST-999\n` +
                `👤 *Customer:* Antigravity AI\n` +
                `📞 *Phone:* 012 345 678\n` +
                `📍 *Address:* វិថីសហព័ន្ធរុស្ស៊ី, ភ្នំពេញ\n\n` +
                `📦 *Items:* \n▫️ Rose Elegance Perfume x1\n▫️ Midnight Gold Luxe Candle x2\n\n` +
                `💰 *Total:* $155.00\n\n` +
                `⚡️ _នេះគឺជាសារសាកល្បងនៃប្រព័ន្ធជូនដំណឹងថ្មីរបស់ MO MO!_`;

async function run() {
  console.log(`🚀 Sending test notification to Admin (${SUPERADMIN_ID})...`);
  try {
    await bot.telegram.sendMessage(SUPERADMIN_ID, testMsg, { parse_mode: 'Markdown' });
    console.log('✅ TEST NOTIFICATION SUCCESS! Check your Telegram.');
  } catch (error) {
    console.error('❌ FAILED:', error.message);
  } finally {
    process.exit(0);
  }
}

run();
