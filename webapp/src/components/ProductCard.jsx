import React from 'react';

const ProductCard = ({ product, onAdd }) => {
  const isOutOfStock = product.stock !== undefined && product.stock <= 0;

  return (
    <div className={`product-card-modern ${isOutOfStock ? 'out-of-stock' : ''}`}>
      <div className="img-container" style={{ position: 'relative' }}>
        <img src={product.image} alt={product.name} style={{ opacity: isOutOfStock ? 0.5 : 1, filter: isOutOfStock ? 'grayscale(80%)' : 'none' }} />
        {isOutOfStock && (
          <div style={{ position: 'absolute', top: 12, right: 12, background: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
            អស់ស្តុក
          </div>
        )}
      </div>
      <div className="card-details">
        <h3 className="product-name-modern">{product.name}</h3>
        <div className="price-row">
          <span className="price-modern">${product.price}</span>
          <button 
            className="add-btn" 
            onClick={() => onAdd(product)}
            disabled={isOutOfStock}
            style={{ opacity: isOutOfStock ? 0.5 : 1, background: isOutOfStock ? '#e2e8f0' : undefined, color: isOutOfStock ? '#94a3b8' : undefined }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
