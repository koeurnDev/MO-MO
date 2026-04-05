require('dotenv').config();
const { Telegraf } = require('telegraf');

if (!process.env.BOT_TOKEN) {
  console.error('Error: BOT_TOKEN is missing in .env file.');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const WEBAPP_URL = 'https://tg-mini-app-webapp.onrender.com';

async function setupBot() {
  try {
    console.log('⏳ Starting Bot Setup...');

    // 1. Set Bot Name
    await bot.telegram.setMyName('Mo Mo APP');
    console.log('✅ Bot Name set to: Mo Mo APP');

    // 2. Clear Description and About text
    await bot.telegram.setMyDescription('');
    await bot.telegram.setMyShortDescription('');
    console.log('✅ About & Description cleared.');

    // 3. Set the Main App Button (Chat Menu Button)
    await bot.telegram.setChatMenuButton({
      type: 'web_app',
      text: 'Shop Now 🛍️',
      web_app: { url: WEBAPP_URL }
    });
    console.log(`✅ Main App Button set to link: ${WEBAPP_URL}`);

    console.log('\n✨ SETUP COMPLETE! Please check your bot profile in Telegram.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupBot();
