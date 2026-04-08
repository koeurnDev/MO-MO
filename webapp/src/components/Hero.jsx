import React, { useState, useEffect } from 'react';
import { useUserState, useUserDispatch } from '../context/UserContext';
import { useShopDispatch, useShopState } from '../context/ShopContext';
import { useCartState, useCartDispatch } from '../context/CartContext';

const Hero = () => {
   const { user, lang, theme, isSuperAdmin, t } = useUserState();
   const { toggleLang, toggleTheme } = useUserDispatch();
   const { setView } = useShopDispatch();
   const { totalItemsCount, cartIconRef } = useCartState();
   const [pulse, setPulse] = useState(false);

   useEffect(() => {
      if (totalItemsCount > 0) {
         setPulse(true);
         const timer = setTimeout(() => setPulse(false), 800);
         return () => clearTimeout(timer);
      }
   }, [totalItemsCount]);

   const userName = user?.first_name || 'Guest User';

   return (
      <div className="hero-section">
         <div className="hero-top-row flex justify-between items-center w-full gap-3">
            {/* 👤 Ultra-Compact Profile (Left) */}
            <div className="profile-badge-luxury flex-shrink-0 cursor-pointer" onClick={() => setView('profile')}>
               <div className="avatar-mini-lux">
                  {user?.photo_url ? (
                     <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                     <div className="avatar-placeholder-lux flex items-center justify-center text-xs">{user?.first_name?.charAt(0) || '👤'}</div>
                  )}
               </div>
               <div className="profile-info-lux ml-2">
                  <span className="user-name-lux text-[12px] font-bold">{user?.first_name || 'Guest User'}</span>
               </div>
            </div>

            {/* 📱 Single Actions Row (Right) */}
            <div className="hero-actions-right flex flex-1 justify-end gap-1.5">
               {/* 🌐 Lang */}
               <div className="lang-switcher-pill flex items-center px-2 h-9 gap-1 cursor-pointer" onClick={toggleLang}>
                  <img src={lang === 'kh' ? 'https://flagcdn.com/w40/kh.png' : 'https://flagcdn.com/w40/gb.png'} alt="" className="w-4 h-4" />
                  <span className="text-[10px] font-black">{lang === 'kh' ? 'KH' : 'EN'}</span>
               </div>

               {/* 🌓 Theme Toggle (Compact) */}
               <div className="theme-toggle-pill flex items-center justify-center w-9 h-9 text-sm cursor-pointer" onClick={toggleTheme}>
                  {theme === 'dark' ? '☀️' : '🌙'}
               </div>

               {/* 🛡 Admin (Shield) */}
               {isSuperAdmin && (
                  <button className="icon-btn-glass w-9 h-9 flex items-center justify-center" onClick={() => setView('admin')}>
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                     </svg>
                  </button>
               )}

               {/* ❤️ Wishlist */}
               <button className="icon-btn-glass w-9 h-9 flex items-center justify-center" onClick={() => setView('wishlist')} aria-label="Wishlist">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
               </button>

               {/* 🛍 Cart Bag */}
               <div className="cart-top-pivot relative cursor-pointer" onClick={() => setView('checkout')} ref={cartIconRef}>
                  <button className={`icon-btn-glass w-9 h-9 flex items-center justify-center ${totalItemsCount > 0 ? 'primary-fill' : ''}`}>
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                        <path d="M3 6h18"></path>
                        <path d="M16 10a4 4 0 0 1-8 0"></path>
                     </svg>
                  </button>
                  {totalItemsCount > 0 && <div className={`cart-badge-pill-top absolute -top-1 -right-1 w-3.5 h-3.5 text-[8px] flex items-center justify-center rounded-full ${pulse ? 'pulse-badge-pop' : ''}`}>{totalItemsCount}</div>}
               </div>
            </div>
         </div>
      </div>
   );
};

export default Hero;
