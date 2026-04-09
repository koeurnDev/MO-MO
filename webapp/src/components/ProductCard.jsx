import React, { useState, memo } from 'react';
import { getDiscountedPrice } from '../utils/discountUtils';
import { useUser } from '../context/UserContext';
import { useTelegram } from '../context/TelegramContext';
import { useShopDispatch } from '../context/ShopContext';

const ProductCard = memo(({ 
  product, onAdd, onViewProduct, discountLookup = {}, 
  variant = 'grid'
}) => {
  const { t } = useUser();
  const { tg } = useTelegram();
  const [isAdded, setIsAdded] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const { showToast } = useShopDispatch();

  const isOutOfStock = product.stock <= 0;

  const handleClick = () => {
    if (isOutOfStock) return;
    onViewProduct(product);
  };

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    setIsAdded(true);
    onAdd(product, e);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const bestDiscount = discountLookup[product.id] || discountLookup['all'] || null;
  const discountedPriceValue = getDiscountedPrice(product, bestDiscount);
  const isDiscounted = bestDiscount !== null;

  const getOptimizedImage = (url) => {
    if (!url || !url.includes('cloudinary')) return url || '';
    return url.replace('/upload/', '/upload/f_auto,q_auto:eco,w_300,c_fill,g_auto/');
  };

  return (
    <div
      className={`product-card-luxury ${isOutOfStock ? 'pc-out-of-stock' : ''}`}
      onClick={handleClick}
    >
      {/* Image */}
      <div className="card-image-wrapper">
        <img
          src={getOptimizedImage(product.image)}
          alt={product.name}
          className="luxury-card-img"
          loading="lazy"
          crossOrigin="anonymous"
        />

        {/* Discount Badge */}
        {isDiscounted && (
          <div className="pc-discount-badge">
            -{bestDiscount.discount_type === 'percent' ? `${bestDiscount.value}%` : `$${bestDiscount.value}`}
          </div>
        )}

        {/* Wishlist Button */}
        <button
          className={`card-wishlist-btn-lux ${isFavorited ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
            setIsFavorited(f => !f);
            if (!isFavorited && showToast) showToast(t('saved_to_wishlist') || 'Saved ✨');
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.82-8.82 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      <div className="card-content-luxury">
        {/* Out of Stock Label */}
        {isOutOfStock && (
          <div className="pc-out-of-stock-label">
            {t('out_of_stock')}
          </div>
        )}
        {/* Name */}
        <h3 className="card-title-luxury">{product.name}</h3>

        {/* Footer: Price + Add Button */}
        <div className="card-footer-luxury">
          <div className="pc-price-block">
            {isDiscounted ? (
              <>
                <span className="price-new-luxury">${discountedPriceValue}</span>
                <span className="price-old-luxury">${product.price}</span>
              </>
            ) : (
              <span className="price-main-luxury">${product.price}</span>
            )}
          </div>

          {!isOutOfStock && (
            <div
              className={`add-btn-luxury ${isAdded ? 'success' : ''}`}
              onClick={handleQuickAdd}
            >
              {isAdded ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ProductCard;
