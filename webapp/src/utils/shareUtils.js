const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'Mo_Mo_APP_Bot';

/** Telegram Mini App deep link — opens app with start_param */
export const buildProductDeepLink = (productId) =>
  `https://t.me/${BOT_USERNAME}?startapp=product_${productId}`;

/** Parse start_param from shared link, e.g. "product_42" → "42" */
export const parseProductStartParam = (startParam) => {
  if (!startParam || typeof startParam !== 'string') return null;
  const match = startParam.match(/^product_(\d+)$/);
  return match ? match[1] : null;
};

export const buildProductShareText = (product, price, lang = 'kh') => {
  const name = product?.name || '';
  const priceStr = `$${price}`;
  if (lang === 'kh') {
    return `🔥 មើលនេះសិន! ${name} — ${priceStr} @ MARUN MINI STORE 👗`;
  }
  return `🔥 Check this out! ${name} — ${priceStr} @ MARUN MINI STORE 👗`;
};

/** Opens Telegram native share sheet with product deep link */
export const shareProduct = (product, price, lang = 'kh') => {
  const tg = window.Telegram?.WebApp;
  if (!tg?.openTelegramLink || !product?.id) return false;

  const deepLink = buildProductDeepLink(product.id);
  const shareText = buildProductShareText(product, price, lang);
  tg.openTelegramLink(
    `https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(shareText)}`
  );
  return true;
};
