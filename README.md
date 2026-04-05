# MO-MO Telegram Mini App - Technical Documentation 🚀

Welcome to the **MO-MO** project—a premium, high-end e-commerce platform built as a Telegram Mini App. This project features a sophisticated React frontend (WebApp) and a robust Node.js backend (Bot API).

---

## 🏗 Project Architecture

- **`/bot`**: Node.js & Express server handling the Telegram Bot, REST API, Database interactions (PostgreSQL), and Image Management (Cloudinary).
- **`/webapp`**: Vite + React frontend providing the premium customer interface and Admin Dashboard.

---

## 🛠 Prerequisites

Before starting, ensure you have the following ready:
1. **Node.js** (v18+ recommended)
2. **Telegram Bot Token** (From [@BotFather](https://t.me/botfather))
3. **Cloudinary Account** (For image hosting)
4. **Neon.tech Account** (For PostgreSQL database)
5. **Render.com Account** (For production deployment)

---

## ⚙️ Setup Instructions

### 1. Backend (`/bot`)
```bash
cd bot
npm install
# Create a .env file based on .env.example
npm start
```
**Required `.env` Variables:**
| Variable | Description |
|---|---|
| `BOT_TOKEN` | Your Telegram Bot Token |
| `DATABASE_URL` | Neon PostgreSQL Connection String |
| `SUPERADMIN_ID` | Your Telegram User ID (for Admin access) |
| `WEBAPP_URL` | The URL where your frontend is hosted |
| `WEBHOOK_URL` | (Production) Your backend URL for Telegram webhooks |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name |
| `CLOUDINARY_API_KEY` | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret |

### 2. Frontend (`/webapp`)
```bash
cd webapp
npm install
# Create a .env file based on .env.example
npm run dev
```
**Required `.env` Variables:**
| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` | The URL of your backend API |

---

## 💾 Maintenance & Operations

### 1. Database Management
- The system automatically initializes tables on startup.
- **Stock Management**: Inventory is deducted automatically on successful orders.
- **Cleanup**: When a product is deleted from the Admin Panel, the server automatically removes the associated image from Cloudinary to save storage.

### 2. Security Configuration
- **Admin Protection**: Only the user matching `SUPERADMIN_ID` can access the `/admin` section. 
- **Signature Verification**: Every admin request is cryptographically verified using Telegram's `initData` signature.
- **Secure Headers**: The server uses `Helmet` to protect against common web attacks.

### 3. Deployment (Render)
- **Backend Service**: Set up as a Node.js Web Service.
- **Frontend Service**: Set up as a Static Site.
- **Webhooks**: Clear the `WEBHOOK_URL` for local polling and set it for production webhook mode.

---

## 💎 Design System & UX
- **Typography**: Outfit (Display), Inter (Body), Kantumruy Pro (Khmer).
- **Aesthetics**: Premium Light Mode with Glassmorphism and Physics-based micro-interactions (Magnetic buttons, 3D Tilt).
- **Loading UX**: Integrated Skeleton Screens for perceived performance.

---

## 📈 Future Scalability
- **Adding Categories**: Simply add a new category name in the `db.js` initial seeds or via the Admin Panel.
- **Multi-Admin**: Update the `isAdmin` middleware to check an array of IDs instead of a single `SUPERADMIN_ID`.
- **Integrations**: The modular API structure allows for easy integration with external payment gateways or shipping providers.

---

**Crafted with pride by Antigravity (Senior UXUI & Full-Stack Developer)**
