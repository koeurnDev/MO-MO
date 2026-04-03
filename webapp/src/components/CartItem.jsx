import React from 'react';

const CartItem = ({ item, updateQty }) => {
  return (
    <div className="cart-item-modern">
      <img src={item.image} alt={item.name} className="cart-item-img" />
      <div className="cart-item-info">
        <div className="cart-item-name">{item.name}</div>
        <div className="price-modern">${item.price}</div>
        <div className="item-qty-controls">
          <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
          <span>{item.quantity}</span>
          <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
