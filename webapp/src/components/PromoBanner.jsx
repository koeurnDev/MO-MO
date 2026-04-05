import React from 'react';

const PromoBanner = ({ threshold, promoText }) => {
  const handleClick = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.isVersionAtLeast && tg.isVersionAtLeast('6.1')) {
      tg.HapticFeedback.impactOccurred('light');
    }
  };

  return (
    <div className="promo-banner-container animate-in">
      <div className="promo-banner-luxury" onClick={handleClick}>
        <span className="promo-tag">New</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {promoText || "🚚 ដឹកជញ្ជូនឥតគិតថ្លៃលើរាល់ការកម្ម៉ង់! • $50+"}
        </span>
      </div>
    </div>
  );
};

export default PromoBanner;
