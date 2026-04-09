import React, { useMemo } from 'react';
import ProductCard from './ProductCard';
import ProductSkeleton from './ProductSkeleton';
import { useShopState, useShopDispatch } from '../context/ShopContext';
import { useUserState } from '../context/UserContext';
import { useCartDispatch } from '../context/CartContext';
import { useTelegram } from '../context/TelegramContext';

const SkeletonGrid = () => (
  <div className="product-grid-main grid grid-cols-2 gap-4 px-5 pb-5">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <ProductSkeleton key={i} />
    ))}
  </div>
);

const ProductGrid = () => {
  const [limit, setLimit] = React.useState(14);
  const { products, searchTerm, debouncedSearchTerm, selectedCategory, activeDiscounts } = useShopState();
  const { setView, setSelectedProduct } = useShopDispatch();
  const { t } = useUserState();
  const { addToCart } = useCartDispatch();
  const { tg } = useTelegram();

  const discountLookup = useMemo(() => {
    const lookup = {};
    (activeDiscounts || []).forEach(d => {
      if (d.apply_to === 'all') {
        if (!lookup['all'] || lookup['all'].value < d.value) lookup['all'] = d;
      } else if (d.product_ids) {
        d.product_ids.forEach(pid => {
          if (!lookup[pid] || lookup[pid].value < d.value) lookup[pid] = d;
        });
      }
    });
    return lookup;
  }, [activeDiscounts]);

  const filtered = useMemo(() => {
    return (products || [])
      .filter(p => {
        const matchesSearch = (p.name || '').toLowerCase().includes((debouncedSearchTerm || '').toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (a.stock > 0 && b.stock <= 0) return -1;
        if (a.stock <= 0 && b.stock > 0) return 1;
        return 0;
      });
  }, [products, debouncedSearchTerm, selectedCategory]);

  const displayed = useMemo(() => filtered.slice(0, limit), [filtered, limit]);
  const hasMore = filtered.length > limit;

  const featured = useMemo(() => (products || []).filter(p => p.stock > 0).slice(0, 3), [products]);
  const showFeatured = searchTerm === '' && selectedCategory === 'all' && featured.length > 0;

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setView('product_detail');
  };

  const handleShowMore = () => {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    setLimit(prev => prev + 20);
  };

  return (
    <div className="section-container">
      {/* ✨ FEATURED ITEMS */}
      {showFeatured && (
        <div className="mb-6">
           <div className="section-header px-5 pb-3 flex items-baseline gap-2.5">
             <h2 className="text-lg font-black text-bold">{t('new')}</h2>
             <span className="text-xs text-primary-accent font-black uppercase tracking-wider">Featured ✨</span>
           </div>
          <div className="featured-slider flex overflow-x-auto gap-4 px-5 pb-5 no-scrollbar">
            {featured.map(fp => (
              <ProductCard 
                key={`feat-${fp.id}`}
                product={fp}
                onAdd={addToCart}
                onViewProduct={handleViewProduct}
                discountLookup={discountLookup}
                variant="featured"
              />
            ))}
          </div>
        </div>
      )}

      {/* 🛍 MAIN GRID HEADER */}
      <div className="section-header px-5 py-4 flex justify-between items-center">
        <h2 className="text-lg font-black text-bold">
          {searchTerm ? t('search_placeholder') : selectedCategory === 'all' ? t('all') : `${t('limited_edition')}៖ ${selectedCategory}`}
        </h2>
        <span className="text-xs font-bold text-muted">{products.length > 0 ? filtered.length : 0} {t('items')}</span>
      </div>

      <div className="px-5">
        {products.length === 0 ? (
          <SkeletonGrid />
        ) : (
          <>
            <div className="product-grid-main grid grid-cols-2 gap-4 pb-4">
              {displayed.length === 0 ? (
                <div className="col-span-2 text-center py-10 opacity-50">
                  <p>{t('empty_cart')}</p>
                </div>
              ) : (
                displayed.map((product, idx) => (
                  <div key={product.id} className={idx < 6 ? `stagger-item` : ''} style={idx < 6 ? { animationDelay: `${Math.min((idx + 1) * 80, 400)}ms` } : {}}>
                    <ProductCard 
                      product={product} 
                      onAdd={addToCart} 
                      onViewProduct={handleViewProduct} 
                      discountLookup={discountLookup} 
                    />
                  </div>
                ))
              )}
            </div>
            
            {hasMore && (
              <div className="pb-10 pt-4 flex justify-center">
                <button 
                  onClick={handleShowMore}
                  className="px-10 py-4 rounded-3xl font-black text-sm active:scale-95 transition-transform"
                  style={{ background: 'var(--bg-soft)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }}
                >
                   📦 {t('view_all')} ({filtered.length - limit})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductGrid;
