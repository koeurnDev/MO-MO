import React from 'react';
import ProductCard from './ProductCard';

/**
 * 💖 Premium Boutique Wishlist Page (សំណព្វ)
 * A dedicated view for user's favorite items to eliminate redundancy.
 */
const WishlistPage = ({ 
  wishlist = [], 
  products = [], 
  onAdd, 
  onViewProduct, 
  onToggleWishlist,
  activeDiscounts = [], 
  handleBulkAddToCart,
  setView, 
  t, 
  lang 
}) => {
  const favoriteProducts = products.filter(p => wishlist.some(id => String(id) === String(p.id)));

  return (
    <div className="history-page-luxury animate-in">
      {/* Header */}
      <div className="history-header-lux" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
           <button onClick={() => setView('home')} className="back-btn-pill">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
           </button>
           <h1 className="detail-title-mega" style={{ fontSize: 24, margin: 0 }}>
              {lang === 'kh' ? 'សំណព្វ' : 'Favorites'} ✨
           </h1>
        </div>
        <div className="slot-meta" style={{ fontSize: 14, fontWeight: 900, color: 'var(--primary-accent)' }}>
           {favoriteProducts.length} {t('items')}
        </div>
      </div>

      {/* Hero-style Bulk Action Banner if items exist */}
      {favoriteProducts.length > 0 && (
         <div className="order-card-luxury" style={{ 
            background: 'var(--primary-gradient)', 
            border: 'none', 
            marginBottom: 25, 
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
         }}>
            <div style={{ color: 'white' }}>
               <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9, marginBottom: 4, fontStyle: 'italic' }}>
                  {lang === 'kh' ? 'ទិញឈុតសំណព្វរបស់អ្នក' : 'Ready to buy favorites?'}
               </div>
               <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: '-0.5px' }}>
                  {lang === 'kh' ? 'បញ្ជូលទៅក្នុងកន្ត្រកទាំងអស់' : 'Add entire collection'}
               </div>
            </div>
            <button 
               className="icon-btn-glass primary-fill bloom-active" 
               style={{ width: 52, height: 52, borderRadius: 20, background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
               onClick={(e) => {
                 handleBulkAddToCart(wishlist);
                 const btn = e.currentTarget;
                 btn.classList.add('pulse-animation');
                 setTimeout(() => btn.classList.remove('pulse-animation'), 600);
               }}
            >
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                  <path d="M3 6h18"></path>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                  <path d="M12 13c-1-1-2-0.5-2 1 0 1.5 2 3 2 3s2-1.5 2-3c0-1.5-1-2-2-1z" fill="currentColor"></path>
               </svg>
            </button>
         </div>
      )}

      {/* Grid Layout */}
      {favoriteProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-soft)', borderRadius: 28, border: '1.5px dashed var(--border-subtle)' }}>
           <div style={{ fontSize: 64, marginBottom: 20, filter: 'grayscale(0.2) opacity(0.8)' }}>💖</div>
           <h2 style={{ fontSize: 20, fontWeight: 950, color: 'var(--text-bold)', marginBottom: 10 }}>
              {lang === 'kh' ? 'មិនទាន់មានសំណព្វនៅឡើយទេ' : 'Your wishlist is empty'}
           </h2>
           <p style={{ color: 'var(--text-main)', opacity: 0.9, fontSize: 14, fontWeight: 800, lineHeight: 1.5, maxWidth: 240, margin: '0 auto' }}>
              {lang === 'kh' ? 'រក្សាទុកទំនិញដែលអ្នកស្រលាញ់ ដើម្បីងាយស្រួលទិញនៅពេលក្រោយ' : 'Save items you love to find them easily later.'}
           </p>
           <button 
              onClick={() => setView('browse')} 
              className="detail-btn-buy-luxury" 
              style={{ marginTop: 25, width: 'auto', padding: '0 30px' }}
           >
              {lang === 'kh' ? 'ទៅមើលទំនិញ' : 'Browse Products'}
           </button>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '15px',
          paddingBottom: '100px' 
        }}>
          {favoriteProducts.map(p => (
            <ProductCard 
              key={p.id}
              product={p}
              onAdd={onAdd}
              onViewProduct={onViewProduct}
              activeDiscounts={activeDiscounts}
              t={t}
              isFavorited={true}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
