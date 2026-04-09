const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const BOT_TOKEN = process.env.BOT_TOKEN;
// Use the production URL for the button (no trailing slash)
const WEBAPP_URL = 'https://tg-mini-app-webapp.onrender.com';

async function setupBot() {
  if (!BOT_TOKEN) {
    console.error('❌ Error: BOT_TOKEN is missing in .env file');
    process.exit(1);
  }

  console.log('🤖 Starting Telegram Bot Setup...');
  console.log(`🔗 Target WebApp URL: ${WEBAPP_URL}`);

  try {
    // 1. Set Chat Menu Button (The button in the bottom left of the chat)
    const menuResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: '🛍️ ចូលហាង MO-MO',
          web_app: { url: WEBAPP_URL }
        }
      })
    });

    const menuData = await menuResponse.json();
    if (menuData.ok) {
      console.log('✅ Success: Chat Menu Button configured!');
    } else {
      console.error('❌ Failed to set Menu Button:', menuData.description);
    }

    // 2. Set Main Mini App Button (The purple button in the bot profile)
    // Note: This is managed via BotFather or the Bot API's setChatMenuButton (standard for all mini-apps)
    console.log('\n✨ Telegram configuration complete!');
    console.log('👉 Please check your bot on Telegram to see the changes.');

  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

setupBot();
