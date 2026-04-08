import React, { useState } from 'react';
import { calculateBestDiscount, getDiscountedPrice } from '../utils/discountUtils';

/**
 * 💎 ProductDetail — Matches reference screenshot (COSRX style)
 * Clean white sheet, floating image, info rows, green sticky footer
 */
const ProductDetail = ({ product, onAdd, onClose, onBuyNow, activeDiscounts = [], t, lang, shopLogoUrl, isFavorited = false, onToggleWishlist }) => {
  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const scrollRef = React.useRef(null);

  if (!product) return null;

  const gallery = [
    product.image,
    ...(typeof product.additional_images === 'string'
      ? JSON.parse(product.additional_images || '[]')
      : (product.additional_images || []))
  ].filter(img => img && typeof img === 'string');

  const bestDiscount = calculateBestDiscount(product, activeDiscounts);
  const discountedPriceValue = getDiscountedPrice(product, bestDiscount);
  const isDiscounted = bestDiscount !== null;
  const isOutOfStock = product.stock <= 0;

  const ratingValue = parseFloat(product.avg_rating || 4.8).toFixed(1);
  const ratingCount = (product.review_count || 217).toLocaleString();

  const handleAdd = (e) => {
    if (isOutOfStock) return;
    for (let i = 0; i < quantity; i++) { onAdd(product, e); }
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  };

  return (
    <div className="pd-overlay">
      <div className="pd-sheet">

        {/* Drag handle */}
        <div className="pd-drag-handle" onClick={onClose} />

        {/* Top Nav */}
        <div className="pd-top-nav">
          <button className="pd-nav-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <button className="pd-nav-btn" onClick={() => typeof onBuyNow === 'function' && onBuyNow()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="pd-scroll">

          {/* Image Gallery */}
          <div className="pd-image-section-wrapper">
            <div className="pd-image-area">
              <div
                className="pd-swiper"
                ref={scrollRef}
                onScroll={(e) => {
                  const idx = Math.round(e.target.scrollLeft / e.target.offsetWidth);
                  if (idx !== activeImg) setActiveImg(idx);
                }}
              >
                {gallery.map((img, i) => (
                  <div key={i} className="pd-slide">
                    <img
                      src={(img && img.includes('cloudinary'))
                        ? img.replace('upload/', 'upload/f_auto,q_auto,w_800,c_pad,b_white/')
                        : img}
                      alt={`${product.name} ${i + 1}`}
                      className="pd-slide-img"
                      crossOrigin="anonymous"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 📸 GALLERY THUMBNAILS — The primary navigation now */}
            {gallery.length > 1 && (
              <div className="pd-thumbnails-row">
                {gallery.map((img, i) => (
                  <div 
                    key={i} 
                    className={`pd-thumb-item ${i === activeImg ? 'active' : ''}`}
                    onClick={() => {
                      scrollRef.current?.scrollTo({ left: i * scrollRef.current.offsetWidth, behavior: 'smooth' });
                      setActiveImg(i);
                    }}
                  >
                    <img 
                      src={img.includes('cloudinary') ? img.replace('upload/', 'upload/f_auto,q_auto,w_200,c_fill,g_auto/') : img} 
                      alt="" 
                      crossOrigin="anonymous" 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* Content */}
          <div className="pd-content">

            {/* Brand */}
            <p className="pd-brand">{product.category || 'MO MO Boutique'}</p>

            {/* Product Name */}
            <h1 className="pd-name">{product.name}</h1>

            {/* Star Rating */}
            <div className="pd-rating-row">
              <span className="pd-star">★</span>
              <span className="pd-rating-val">{ratingValue}</span>
              <span className="pd-rating-count">({ratingCount} Reviews)</span>
            </div>

            {/* Price */}
            <div className="pd-price-row">
              <span className="pd-price-now">${discountedPriceValue} USD</span>
              {isDiscounted && (
                <>
                  <span className="pd-price-was">${product.price} USD</span>
                  <span className="pd-pct-badge">
                    -{bestDiscount.value}{bestDiscount.discount_type === 'percent' ? '%' : '$'}
                  </span>
                </>
              )}
            </div>

            {/* Info rows */}
            <div className="pd-info-rows">
              <div className="pd-info-row">
                <span className={`pd-stock-icon ${isOutOfStock ? 'out' : ''}`}>●</span>
                <span className={`pd-info-text ${isOutOfStock ? '' : 'green'}`}>
                  {isOutOfStock
                    ? (lang === 'kh' ? 'អស់ស្តុក' : 'Out of stock')
                    : (lang === 'kh' ? `មានស្តុក (${product.stock})` : 'In stock')}
                </span>
              </div>
              <div className="pd-info-row">
                <svg className="pd-info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
                <span className="pd-info-text">{lang === 'kh' ? 'ដឹកជញ្ជូនឥតគិតថ្លៃ' : 'Free delivery'}</span>
              </div>
              <div className="pd-info-row">
                <svg className="pd-info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span className="pd-info-text">{lang === 'kh' ? 'មានលក់នៅ MO MO Boutique' : 'Available in the nearest store'}</span>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <p className="pd-desc">{product.description}</p>
            )}

          </div>
        </div>

        {/* Sticky Footer */}
        <div className="pd-footer">
          <button
            className={`pd-heart-btn ${isFavorited ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); if (typeof onToggleWishlist === 'function') onToggleWishlist(); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.82-8.82 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          <button
            className={`pd-cart-btn ${isOutOfStock ? 'disabled' : ''}`}
            onClick={handleAdd}
            disabled={isOutOfStock}
          >
            {isOutOfStock
              ? (lang === 'kh' ? 'អស់ស្តុក' : 'Out of Stock')
              : (t ? t('add_to_cart') : (lang === 'kh' ? 'បន្ថែមទៅកន្ត្រក' : 'Add to Cart'))
            }
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProductDetail;
