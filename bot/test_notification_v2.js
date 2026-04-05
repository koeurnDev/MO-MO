const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const SUPERADMIN_ID = process.env.SUPERADMIN_ID;

const nowTime = new Date().toLocaleString('en-US', { 
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
});

const msg = "🛍 *តេស្តការបញ្ជាទិញ V2 - New Order*\n\n" +
            "📅 *កាលបរិច្ឆេទ:* " + nowTime + "\n" +
            "👤 *អ្នកទិញ:* Antigravity AI\n\n" +
            "💰 *សរុប:* $250.00\n\n" +
            "⚡️ _បច្ចុប្បន្នភាព៖ បន្ថែមម៉ោង និង ថ្ងៃ ខែ ឆ្នាំ (Compatible Version)_";

async function main() {
  console.log('Sending V2 (Fixed TZ)...');
  try {
    await bot.telegram.sendMessage(SUPERADMIN_ID, msg, { parse_mode: 'Markdown' });
    console.log('SUCCESS');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit(0);
  }
}

main();
