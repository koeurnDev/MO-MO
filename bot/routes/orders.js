const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { KHQR, TAG, CURRENCY, COUNTRY } = require('ts-khqr');
const { pool, createOrder, deductStock, getSetting, upsertUser, addLoyaltyPoints } = require('../db');

let bot;
router.setBot = (b) => { bot = b; };

const logError = (msg) => {
  const logMsg = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(path.join(__dirname, '../../error_log.txt'), logMsg);
};

const md5 = (text) => {
  if (!text) return '';
  return crypto.createHash('md5').update(String(text)).digest('hex');
};

/**
 * 📊 Debug Status Check
 */
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });

    let order = result.rows[0];
    const qrMd5 = order.qr_string ? md5(order.qr_string) : null;

    if (order.status === 'pending' && order.qr_string) {
      const settingsResult = await pool.query('SELECT key, value FROM settings WHERE key IN ($1, $2, $3, $4)', 
        ['bakong_api_url', 'bakong_api_token', 'bakong_auto_confirm', 'bakong_account_id']);
      const settings = Object.fromEntries(settingsResult.rows.map(r => [r.key, r.value]));

      const apiUrl = process.env.BAKONG_API_URL || settings.bakong_api_url;
      const apiToken = process.env.BAKONG_API_TOKEN || settings.bakong_api_token;

      if (apiUrl && apiToken) {
        try {
          const checkMd5 = md5(order.qr_string);
          const checkUrl = apiUrl.endsWith('/') ? `${apiUrl}v1/check_transaction_by_md5` : `${apiUrl}/v1/check_transaction_by_md5`;
          
          // Log request details
          logError(`[TRACE] Checking order #${id} | MD5: ${checkMd5} | URL: ${checkUrl}`);

          const response = await fetch(checkUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${apiToken}`
            },
            body: JSON.stringify({ md5: checkMd5 })
          });

          const data = await response.json();
          // Log response body for debugging
          logError(`[TRACE] Bakong Answer for #${id}: ${JSON.stringify(data)}`);

          // ✅ Fix: Bakong returns numeric 0 for success, and we don't need data.status check here
          if (data && (data.responseCode === 0 || data.responseCode === "0")) {
             await pool.query('UPDATE orders SET status = $1 WHERE id = $2', ['paid', id]);
             order.status = 'paid';
             if (bot) {
               bot.telegram.sendMessage(order.user_id, `✅ *ការបង់ប្រាក់ជោគជ័យ - #MO-${id}*`).catch(e => logError(`Notify Fail: ${e.message}`));
             }
          }
        } catch (apiError) { 
          logError(`[TRACE] Bakong API Crash: ${apiError.message}`); 
        }
      }
    }
    res.json({ success: true, status: order.status, md5: qrMd5 });
  } catch (error) { 
    logError(`Status check fail: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' }); 
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId, userName, items, total, deliveryInfo } = req.body;
    if (!items || total === undefined) return res.status(400).json({ success: false, error: 'Missing details' });

    const shopStatus = await getSetting('shop_status');
    if (shopStatus === 'closed') return res.status(403).json({ success: false, error: 'Shop closed' });

    for (const item of items) {
      if (!item.id || !item.quantity) continue;
      const updated = await deductStock(item.id, item.quantity);
      if (!updated) throw new Error(`${item.name} អស់ស្តុកហើយ`);

      // ⚠️ Low Stock Alert for Admin
      if (updated.stock <= 3 && bot && process.env.SUPERADMIN_ID) {
        const lowStockMsg = `⚠️ *សេចក្តីជូនដំណឹង*: ទំនិញ [${updated.name}] ជិតអស់ពីស្តុកហើយ (សល់តែ ${updated.stock} ទៀតប៉ុណ្ណោះ)។\n🏢 ហាង MO MO Boutique`;
        bot.telegram.sendMessage(process.env.SUPERADMIN_ID, lowStockMsg, { parse_mode: 'Markdown' })
          .catch(e => logError(`Stock Alert Fail: ${e.message}`));
      }
    }

    const order = await createOrder({ 
      userId: userId || null, 
      userName: userName || 'Guest', 
      items: items, 
      total: parseFloat(total) || 0, 
      qrString: '' 
    });

    try {
      const bakongId = process.env.MERCHANT_BAKONG_ID || await getSetting('bakong_account_id');
      const merchantName = process.env.BAKONG_MERCHANT_NAME || await getSetting('bakong_merchant_name');
      
      const qrResult = KHQR.generate({
        tag: TAG.INDIVIDUAL,
        accountID: bakongId,
        merchantName: merchantName,
        merchantCity: 'Phnom Penh',
        amount: String(parseFloat(total).toFixed(2)),
        currency: CURRENCY.USD,
        countryCode: COUNTRY.KH,
        expirationTimestamp: Date.now() + 5 * 60 * 1000, 
        additionalData: { billNumber: `MO-${order.id}` }
      });

      if (qrResult && qrResult.data && qrResult.status.code === 0) {
         await pool.query('UPDATE orders SET qr_string = $1 WHERE id = $2', [qrResult.data.qr, order.id]);
         order.qr_string = qrResult.data.qr;
      }
    } catch (qrErr) { logError(`QR Fail: ${qrErr.message}`); }

    if (userId && deliveryInfo) {
      await upsertUser(userId, deliveryInfo.phone || '', deliveryInfo.address || '').catch(e => logError(e.message));
      await addLoyaltyPoints(userId, Math.floor(parseFloat(total))).catch(e => logError(e.message));
    }
    
    if (bot && process.env.SUPERADMIN_ID) {
      const adminMsg = `✨ *ការបញ្ជាទិញថ្មី - #MO-${order.id}*`;
      bot.telegram.sendMessage(process.env.SUPERADMIN_ID, adminMsg).catch(e => logError(e.message));
    }
    
    res.json({ success: true, order: order });
  } catch (err) { 
    logError(`POST /api/orders FAIL: ${err.message}`);
    if (err.message.includes('អស់ស្តុកហើយ')) return res.status(400).json({ success: false, error: err.message });
    res.status(500).json({ success: false, error: 'Internal server error' }); 
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json({ success: true, orders: result.rows });
  } catch (error) {
    logError(`Get history fail: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
