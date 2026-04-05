import React from 'react';
import { calculateBestDiscount, getDiscountedPrice } from '../utils/discountUtils';

const ProductCard = React.memo(({ product, onAdd, activeDiscounts = [] }) => {
  const isOutOfStock = product.stock <= 0;

  const handleClick = () => {
    if (isOutOfStock) return;
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    onAdd(product);
  };

  const bestDiscount = calculateBestDiscount(product, activeDiscounts);
  const discountedPriceValue = getDiscountedPrice(product, bestDiscount);
  const isDiscounted = bestDiscount !== null;

  return (
    <div 
      className={`card-sticker animate-in ${isOutOfStock ? 'out-of-stock-card' : ''}`} 
      onClick={handleClick}
      style={{ 
        padding: 15, 
        opacity: isOutOfStock ? 0.7 : 1, 
        cursor: isOutOfStock ? 'default' : 'pointer',
        textAlign: 'center'
      }}
    >
      <div style={{ 
        position: 'relative', 
        borderRadius: 24, 
        overflow: 'hidden', 
        marginBottom: 15, 
        background: '#fff5f7',
        border: '3px solid white',
        boxShadow: 'inset 0 0 20px rgba(255, 114, 160, 0.05)'
      }}>
        <img 
          src={product.image || 'https://via.placeholder.com/200'} 
          alt={product.name} 
          style={{ width: '100%', height: 200, objectFit: 'cover' }}
        />
        
        {/* 🏷️ Bubbly Price Badge */}
        <div style={{ 
          position: 'absolute', 
          top: 10, 
          right: 10, 
          backgroundColor: '#ff1c1c', 
          border: '2px solid white', 
          color: 'white', 
          padding: '6px 12px', 
          borderRadius: 20, 
          fontWeight: 900, 
          fontSize: 16,
          boxShadow: '0 4px 10px rgba(255, 28, 28, 0.3)'
        }}>
          {isDiscounted ? `$${discountedPriceValue}` : `$${product.price}`}
        </div>

        {isOutOfStock && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ background: '#1f2937', color: 'white', padding: '5px 12px', borderRadius: 12, fontWeight: 900, fontSize: 10 }}>OUT OF STOCK</span>
          </div>
        )}
      </div>

      <h3 style={{ 
        margin: '0 0 5px', 
        fontSize: 18, 
        color: '#ff72a0', 
        textShadow: '1px 1px 0 #fff',
        fontFamily: "'Bubblegum Sans', cursive"
      }}>
        {product.name}
      </h3>
      
      <p style={{ margin: '0 0 15px', fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>
        {product.category || 'Boutique Item'}
      </p>

      {!isOutOfStock ? (
        <button 
          className="btn-bubbly" 
          style={{ width: '100%', padding: '10px', borderRadius: 25, fontSize: 14 }}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          🛒 បន្ថែមអីវ៉ាន់
        </button>
      ) : (
        <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 800, padding: '10px' }}>
          ទំនិញអស់ស្តុក
        </div>
      )}
    </div>
  );
});

export default ProductCard;
