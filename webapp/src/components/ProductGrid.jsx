import React, { useRef, useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import { calculateBestDiscount, getDiscountedPrice } from '../utils/discountUtils';

const SkeletonGrid = () => (
  <div className="product-grid-main">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="skeleton-card">
         <div className="skeleton-img skeleton-shimmer"></div>
         <div className="skeleton-title skeleton-shimmer"></div>
         <div className="skeleton-price skeleton-shimmer"></div>
      </div>
    ))}
  </div>
);

const ProductGrid = ({ products, searchTerm, selectedCategory, onAdd, activeDiscounts = [] }) => {
  const sliderRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const inStockProducts = products.filter(p => (p.price >= 80 || p.is_masterpiece) && p.stock > 0);
    const maxIndex = Math.min(inStockProducts.length > 0 ? inStockProducts.length : [...products].length, 3) - 1;
    
    if (maxIndex <= 0 || searchTerm !== '' || selectedCategory !== 'all') return;

    let currentIndex = 0;
    let direction = 1;

    const interval = setInterval(() => {
      currentIndex += direction;
      
      if (currentIndex >= maxIndex) {
         currentIndex = maxIndex;
         direction = -1;
      } else if (currentIndex <= 0) {
         currentIndex = 0;
         direction = 1;
      }
      
      setActiveIndex(currentIndex);

      if (slider.children[currentIndex]) {
        slider.children[currentIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [products, searchTerm, selectedCategory]);

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Featured items (Only IN STOCK)
  const featured = products.filter(p => p.stock > 0).slice(0, 3);
  const showFeatured = searchTerm === '' && selectedCategory === 'all' && featured.length > 0;

  // Masterpiece selection (Only IN STOCK)
  const masterpieces = [...products].filter(p => p.stock > 0).sort((a, b) => b.price - a.price).slice(0, 3);
  const showMasterpieces = searchTerm === '' && selectedCategory === 'all' && masterpieces.length > 0;

  return (
    <div className="section-container animate-in">
      {/* 🏆 MASTERPIECES */}
      {showMasterpieces && (
        <div className="masterpiece-slider" ref={sliderRef}>
          {masterpieces.map((starProduct, index) => {
            const best = calculateBestDiscount(starProduct, activeDiscounts);
            const dPrice = best ? getDiscountedPrice(starProduct, best) : null;
            
            return (
              <div key={`star-${starProduct.id}`} 
                   className={`masterpiece-card ${index === activeIndex ? 'masterpiece-card-active' : ''}`} 
                  onClick={() => onAdd(starProduct)}>
                <div className="masterpiece-glow"></div>
                <div className="masterpiece-badge">
                  <span>🏆</span> TOP SELLER
                </div>
                <div className="masterpiece-title">{starProduct.name}</div>
                <div className="masterpiece-price">
                  {dPrice ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, textDecoration: 'line-through', opacity: 0.6 }}>${starProduct.price}</span>
                      <span>${dPrice}</span>
                    </div>
                  ) : `$${starProduct.price}`}
                </div>
                <img 
                  src={starProduct.image.replace('upload/', 'upload/f_auto,q_auto,w_400/')} 
                  className="masterpiece-img" 
                  alt="" 
                  crossOrigin="anonymous"
                  decoding="async"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ✨ FEATURED ITEMS */}
      {showFeatured && (
        <>
          <div className="section-header" style={{ paddingBottom: 15 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>ទំនិញពេញនិយម ✨</h2>
            <span style={{ fontSize: 13, color: '#ec4899', fontWeight: 700 }}>Featured</span>
          </div>
          <div className="featured-slider">
            {featured.map(fp => {
              const best = calculateBestDiscount(fp, activeDiscounts);
              const dPrice = best ? getDiscountedPrice(fp, best) : null;

              return (
                <div key={`feat-${fp.id}`} className="featured-card" onClick={() => onAdd(fp)}>
                  <div style={{ position: 'relative' }}>
                    <img 
                       src={fp.image.replace('upload/', 'upload/f_auto,q_auto,w_200/')} 
                       alt="" 
                       crossOrigin="anonymous" 
                       decoding="async"
                    />
                    {best && (
                      <div style={{ position: 'absolute', top: 5, right: 5, background: '#a855f7', color: 'white', fontSize: 9, padding: '2px 6px', borderRadius: 8, fontWeight: 900 }}>SALE</div>
                    )}
                  </div>
                  <div className="featured-label">{fp.category.toUpperCase()}</div>
                  <div className="featured-title">{fp.name}</div>
                  <div className="featured-price-tag">
                    {dPrice ? (
                       <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ color: '#ec4899' }}>${dPrice}</span>
                          <span style={{ fontSize: 10, textDecoration: 'line-through', opacity: 0.5 }}>${fp.price}</span>
                       </div>
                    ) : `$${fp.price}`}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 🛍 MAIN GRID */}
      <div className="section-header">
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>
          {searchTerm ? 'លទ្ធផលស្វែងរក' : selectedCategory === 'all' ? 'ទំនិញទាំងអស់' : `ប្រភេទ៖ ${selectedCategory}`}
        </h2>
        <span className="slot-meta" style={{ opacity: 0.7 }}>{products.length > 0 ? filtered.length : 0} items</span>
      </div>

      <div style={{ padding: '0 20px' }}>
        {products.length === 0 ? (
           <SkeletonGrid />
        ) : (
          <div className="product-grid-main">
            {filtered.length === 0 ? (
              <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
                 <p>មិនទាន់មានទំនិញក្នុងប្រភេទនេះទេ</p>
              </div>
            ) : (
              filtered.map(product => (
                <ProductCard key={product.id} product={product} onAdd={onAdd} activeDiscounts={activeDiscounts} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductGrid;
