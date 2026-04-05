import React from 'react';

const CartItem = ({ item, updateQty }) => {
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
        <div className="slot-price">${item.price.toFixed(2)}</div>
      </div>

      <div className="qty-pill-container">
        <button className="qty-action" onClick={() => updateQty(item.id, -1)}>
           <svg width="12" height="2" viewBox="0 0 12 2" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="0" y1="1" x2="12" y2="1" /></svg>
        </button>
        <div className="qty-number">{item.quantity}</div>
        <button className="qty-action" onClick={() => updateQty(item.id, 1)}>
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>
    </div>
  );
};

export default CartItem;
