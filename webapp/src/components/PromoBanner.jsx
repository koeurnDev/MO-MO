import React, { useState } from 'react';

const PromoBanner = ({ threshold, promoText, promoBannerUrl, t, lang }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  if (promoBannerUrl) {
    return (
      <div className="ads-hero-container">
        <div className={`ads-hero-wrapper animate-in ${isLoaded ? 'loaded' : 'loading'}`}>
           {!isLoaded && <div className="ads-hero-skeleton"></div>}
           <img 
              src={promoBannerUrl.replace('upload/', 'upload/f_auto,q_auto,w_1000/')} 
              alt="Boutique Poster" 
              className={`ads-hero-img ${isLoaded ? 'visible' : 'hidden'}`}
              onLoad={() => setIsLoaded(true)}
              crossOrigin="anonymous"
           />
           <div className="ads-hero-glass-edge"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="promo-banner-container">
      <div className="promo-banner-luxury animate-in">
        <div className="promo-pill">
          <span className="promo-icon">🚚</span>
          <span className="promo-text">
            {promoText || (lang === 'en' ? `Free Delivery on orders over $${threshold}` : `ដឹកជញ្ជូនឥតគិតថ្លៃរាល់ការកុម្មង់ចាប់ពី $${threshold} ឡើងទៅ`)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PromoBanner;
