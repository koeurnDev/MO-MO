import React, { useState } from 'react';
import CartItem from './CartItem';
import DeliveryForm from './DeliveryForm';

const CartPage = ({ cart, updateQty, clearCart, user, formData, setFormData, totalPrice, setView, BACKEND_URL, onCheckout, activeDiscounts = [], deliveryThreshold = 50, deliveryFee = 1.5, isPlacingOrder = false }) => {
  const threshold = parseFloat(deliveryThreshold) || 50;
  const fee = parseFloat(deliveryFee) || 0;

  // 1. Calculate Per-item Automatic Discounts
  const totalDiscount = cart.reduce((sum, item) => {
    const relevant = activeDiscounts.filter(d => d.apply_to === 'all' || (d.product_ids && d.product_ids.includes(item.id)));
    if (relevant.length === 0) return sum;
    
    const best = relevant.sort((a, b) => {
      const valA = a.discount_type === 'percent' ? (item.price * a.value / 100) : a.value;
      const valB = b.discount_type === 'percent' ? (item.price * b.value / 100) : b.value;
      return valB - valA;
    })[0];

    const itemDiscount = best.discount_type === 'percent' 
      ? (item.price * (best.value / 100)) 
      : Math.min(item.price, best.value);
    
    return sum + (itemDiscount * item.quantity);
  }, 0);

  const subTotal = Math.max(0, totalPrice - totalDiscount);
  const isFreeDelivery = subTotal >= threshold;
  const appliedFee = isFreeDelivery ? 0 : fee;
  const finalTotal = subTotal + appliedFee;

  return (
    <main className="checkout-section animate-in">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setView('home')} className="back-btn-pill">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>កន្ត្រករបស់ខ្ញុំ 💅</h2>
        </div>
        <div className="trash-btn-wrapper" onClick={clearCart}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          ជម្រះ
        </div>
      </div>

      <div className="cart-list-modern">
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', background: 'white', borderRadius: 24 }}>
            <div style={{ fontSize: 60, marginBottom: 20 }}>🌸</div>
            <p style={{ color: '#94a3b8', fontSize: 16, fontWeight: 600, marginBottom: 25 }}>មិនទាន់មានទំនិញទេ</p>
            <button onClick={() => setView('home')} className="shop-now-btn" style={{ padding: '16px 35px' }}>ត្រលប់ទៅទិញទំនិញ</button>
          </div>
        ) : (
          cart.map(item => (
            <CartItem key={item.id} item={item} updateQty={updateQty} />
          ))
        )}
      </div>

      {cart.length > 0 && (
        <div className="checkout-details-container animate-in">
          <DeliveryForm user={user} formData={formData} setFormData={setFormData} />
          
          <div className="payment-selector-boutique">
             <div className="payment-label-luxury">វិធីបង់ប្រាក់ (Payment Method)</div>
             <div className="payment-grid-luxury">
                <div className="payment-option-glass active">
                   <div className="payment-check">✓</div>
                   <div className="payment-content-luxury">
                      <span className="pay-icon-luxury">🇰🇭</span>
                      <span className="pay-name-luxury">Bakong KHQR (ABA / All Banks)</span>
                   </div>
                </div>
             </div>
          </div>
          
          <div className="checkout-summary-clean">
            <div className="summary-row">
              <span style={{ fontWeight: 600 }}>តម្លៃទំនិញ</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="summary-row" style={{ color: '#ec4899', fontWeight: 700 }}>
                <span>បញ្ចុះតម្លៃសរុប</span>
                <span>-${totalDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row">
              <span style={{ fontWeight: 600 }}>សេវាដឹកជញ្ជូន</span>
              <span style={{ color: isFreeDelivery ? '#22c55e' : 'inherit', fontWeight: isFreeDelivery ? 800 : 600 }}>
                 {isFreeDelivery ? 'ឥតគិតថ្លៃ (FREE)' : `$${fee.toFixed(2)}`}
              </span>
            </div>
            <div className="summary-row grand-total">
              <span>សរុបចុងក្រោយ</span>
              <span>${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <button 
            className={`confirm-order-btn-premium ${isPlacingOrder ? 'processing' : ''}`} 
            onClick={() => !isPlacingOrder && onCheckout(finalTotal)}
            disabled={isPlacingOrder}
          >
             {isPlacingOrder ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                   <div className="btn-spinner"></div>
                   កំពុងរៀបចំការបញ្ជាទិញ...
                </div>
             ) : (
                `បញ្ជាក់ការបញ្ជាទិញ ($${finalTotal.toFixed(2)})`
             )}
          </button>
        </div>
      )}
    </main>
  );
};

export default CartPage;
