# Telegram Mini App (TMA) - Complete Boilerplate

This project contains a fully functional Telegram Mini App ecosystem, including a Node.js bot and a React-based frontend.

## 📁 Project Structure

- `/bot`: Node.js Express server using `Telegraf`.
- `/webapp`: React frontend built with `Vite` and `Telegram WebApp API`.

## 🚀 Getting Started

### 1. Bot Setup (via @BotFather)
1. Go to [@BotFather](https://t.me/BotFather) on Telegram.
2. Create a new bot using `/newbot` and save your `BOT_TOKEN`.
3. Set your Bot's Menu Button or Keyboard Button to your WebApp URL (see Deployment below).

### 2. Configuration
- **Bot**: Copy `bot/.env.example` to `bot/.env` and fill in your `BOT_TOKEN` and `WEBAPP_URL`.
- **WebApp**: No environment variables needed for this basic setup, but ensure your bot's `WEBAPP_URL` matches your frontend URL.

### 3. Local Development

#### A. Run the WebApp
```bash
cd webapp
npm run dev
```
The app will typically run on `http://localhost:5173`.

#### B. Expose to HTTPS (Required by Telegram)
Use a tool like `ngrok` or `localtunnel` to create an HTTPS tunnel to your local React dev server.
```bash
ngrok http 5173
```
Copy the `https://...` URL and update your `bot/.env` with it.

#### C. Run the Bot
```bash
cd bot
npm start
```

---

## 🛠 Features

### Telegram Integration
- **User Info**: Accesses `ID`, `username`, and `photo_url` via `window.Telegram.WebApp.initDataUnsafe`.
- **Haptic Feedback**: Triggers tactile response on button clicks.
- **Confirmation Dialogs**: Native Telegram UI for action confirmation.
- **Main Button Integration**: Example of sending data back to the bot chat.

### Payments (Simulation)
- Includes placeholder functions (`handleBuyNow`) explaining where backend verification would occur (Stripe/PayPal webhooks).

---

## 🌎 Deployment Notes

### WebApp Hosting
- Host the `webapp` on any static provider (Vercel, Netlify, or your own server).
- MUST be served over **HTTPS**.

### Bot Hosting
- Host the `bot` on a Node.js-capable server (Heroku, Render, DigitalOcean).
- Use a **Webhook** instead of long polling for production stability (`bot/index.js` has comments for this).

---

## 🔗 Connecting Bot & WebApp
In `@BotFather`:
1. Use `/setmenubutton`.
2. Select your bot.
3. Provide your HTTPS WebApp URL.
4. Now, your bot will have a button that opens the Mini App inside Telegram!
