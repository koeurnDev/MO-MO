require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Ensure token exists
if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN is missing in environment variables.');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const SUPERADMIN_ID = parseInt(process.env.SUPERADMIN_ID) || 0;

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(express.json());
app.use(cors());

const { validateInitData } = require('./utils/auth');

const { getProducts, createOrder, getOrders, updateOrderStatus, addProduct, updateProduct, deleteProduct, getUser, upsertUser, deductStock } = require('./db');

// Health Check
app.get('/', (req, res) => res.send('Mini App Bot Backend is online!'));

// InitData Verification Endpoint
app.post('/api/verify', (req, res) => {
  const { initData } = req.body;
  const isValid = validateInitData(initData, process.env.BOT_TOKEN);

  if (isValid) {
    const params = new URLSearchParams(initData);
    const userRaw = params.get('user');
    const user = JSON.parse(userRaw || '{}');
    const isAdmin = Number(user.id) === Number(SUPERADMIN_ID);

    console.log(`[DEBUG] RAW User: ${userRaw}`);
    console.log(`[DEBUG] Parsed ID: ${user.id} (Type: ${typeof user.id}) | Admin ID: ${SUPERADMIN_ID} (Type: ${typeof SUPERADMIN_ID}) | Match: ${isAdmin}`);

    res.json({ success: true, user, isAdmin });
  } else {
    console.log(`[DEBUG] Validation FAILED for initData: ${initData.substring(0, 50)}...`);
    res.status(401).json({ success: false, error: 'Invalid InitData' });
  }
});

// Admin: Add New Product
app.post('/api/admin/products', async (req, res) => {
  try {
    const product = await addProduct(req.body);
    res.json({ success: true, product });
  } catch (err) {
    console.error('Failed to add product:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Upload Image to Cloudinary
app.post('/api/admin/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    // Upload from buffer
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'products' },
      (error, result) => {
        if (error) return res.status(500).json({ success: false, error: error.message });
        res.json({ success: true, url: result.secure_url });
      }
    );
    stream.end(req.file.buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch Saved User Info
app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await getUser(req.params.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Submit Order to DB
app.post('/api/orders', async (req, res) => {
  const { userId, userName, items, total, deliveryInfo } = req.body;
  try {
    // 1. Deduct Stock for each item
    for (const item of items) {
      const updated = await deductStock(item.id, item.quantity);
      if (!updated) {
        throw new Error(`ទំនិញ ${item.name} អស់ស្តុកហើយ (Out of stock)`);
      }
    }

    // 2. Create Order
    const order = await createOrder({ userId, userName, items, total });
    
    // 3. Save/Update User Info for next time
    if (userId) {
      await upsertUser(userId, deliveryInfo.phone, deliveryInfo.address);
    }

    // Notify Admin via Telegram
    const itemsText = items.map(i => `- ${i.name} (x${i.quantity})`).join('\n');
    const msg = `🚨 *ការកុម្ម៉ង់ថ្មី! (New Order)*\n\n` +
                `👤 *អតិថិជន:* ${userName}\n` +
                `📞 *លេខទូរស័ព្ទ:* ${deliveryInfo.phone}\n` +
                `📍 *អាស័យដ្ឋាន:* ${deliveryInfo.address}\n\n` +
                `🛍 *ទំនិញ:*\n${itemsText}\n\n` +
                `💰 *សរុប:* $${total.toFixed(2)}`;
    
    bot.telegram.sendMessage(SUPERADMIN_ID, msg, { parse_mode: 'Markdown' })
      .catch(err => console.error('Failed to notify admin:', err));

    res.json({ success: true, orderId: order.id });
  } catch (err) {
    console.error('Failed to create order:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Fetch All Orders
app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await getOrders();
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Failed to fetch orders:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Update Order Status
app.post('/api/admin/orders/status', async (req, res) => {
  const { orderId, status } = req.body;
  try {
    const updated = await updateOrderStatus(orderId, status);
    res.json({ success: true, order: updated });
  } catch (err) {
    console.error('Failed to update status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Product Management
app.post('/api/admin/products', async (req, res) => {
  try {
    const product = await addProduct(req.body);
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/admin/products/:id', async (req, res) => {
  try {
    const product = await updateProduct(req.params.id, req.body);
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    await deleteProduct(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Middleware to log requests
bot.use((ctx, next) => {
  if (ctx.from) {
    console.log(`User ${ctx.from.id} (${ctx.from.username || 'unknown'}) sent: ${ctx.message?.text || 'non-text'}`);
  }
  return next();
});

// /start Command
bot.start((ctx) => {
  const userName = ctx.from.first_name;
  ctx.reply(
    `សួស្តី ${userName}! សូមស្វាគមន៍មកកាន់ replicaaroma 🚀\nWelcome to replicaaroma! Click below to shop.`,
    Markup.inlineKeyboard([
      [Markup.button.webApp('កុម្មង់ឥឡូវនេះ (Shop Now)', process.env.WEBAPP_URL)],
      [Markup.button.url('ជំនួយ (Support)', 'https://t.me/replicated')]
    ])
  );
});

// /admin Command
bot.command('admin', (ctx) => {
  const userId = ctx.from.id;
  if (userId === SUPERADMIN_ID) {
    ctx.reply('Welcome, SuperAdmin! Use the Mini App to manage your shop.');
  } else {
    ctx.reply('សុំទោស អ្នកមិនមានសិទ្ធិចូលប្រើប្រាស់ឡើយ។ (Access Denied)');
  }
});

// Mock WebApp Data Processing
bot.on('web_app_data', (ctx) => {
  try {
    const data = JSON.parse(ctx.webAppData.data.json());
    console.log('Received data from WebApp:', data);
    ctx.reply(`ទទួលបានការបញ្ជាទិញ: ${data.action}`);
  } catch (err) {
    console.error('Error parsing WebApp data:', err);
    ctx.reply('មានបញ្ហាក្នុងការបញ្ជូនទិន្នន័យ។');
  }
});

// Generic Message Handler
bot.on('message', (ctx) => {
  ctx.reply('សូមប្រើបញ្ជារ /start ដើម្បីបើកកម្មវិធី។ (Use /start to open the app)');
});

// App server & Bot Launch
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
  
  // Set the Chat Menu Button
  bot.telegram.setChatMenuButton({
    menuButton: {
      type: 'web_app',
      text: 'កុម្មង់ឥឡូវនេះ',
      web_app: { url: process.env.WEBAPP_URL }
    }
  }).catch(err => console.error('Failed to set Chat Menu Button:', err));

  bot.launch()
    .then(() => console.log('Telegram Bot successfully launched via Long Polling.'))
    .catch((err) => console.error('Failed to launch bot:', err));
});

// Graceful Termination
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
