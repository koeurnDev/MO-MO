import React from 'react';

const CartItem = ({ item, updateQty, t, lang }) => {
  // Optimized image URL helper
  const getOptimizedImg = (url, width) => {
    if (!url) return '';
    if (!url.includes('cloudinary.com')) return url;
    const cleanUrl = url.replace(/\/f_auto,q_auto,?[^/]*\//, '/');
    return cleanUrl.replace('upload/', `upload/f_auto,q_auto,${width ? `w_${width}` : ''}/`);
  };

  return (
    <div className="cart-item-slot-luxury animate-in">
      <div className="slot-image-box">
        <img 
          src={getOptimizedImg(item.image, 150)} 
          alt={item.name} 
          crossOrigin="anonymous" 
          decoding="async"
        />
      </div>
      
      <div className="slot-details">
        <div className="slot-name">{item.name}</div>
        <div className="qty-pill-container">
          <button className="qty-action" onClick={() => updateQty(item.id, -1)} aria-label={lang === 'kh' ? 'បន្ថយចំនួន' : 'Decrease Quantity'}>
            −
          </button>
          <div className="qty-number">{item.quantity}</div>
          <button className="qty-action" onClick={() => updateQty(item.id, 1)} aria-label={lang === 'kh' ? 'បង្កើនចំនួន' : 'Increase Quantity'}>
            +
          </button>
        </div>
      </div>

      <div className="slot-right-box">
        <div className="slot-price">${item.price.toFixed(2)}</div>
        <button 
          className="remove-btn-minimal" 
          onClick={() => updateQty(item.id, -item.quantity)}
        >
          {t('remove')}
        </button>
      </div>
    </div>
  );
};

export default CartItem;
