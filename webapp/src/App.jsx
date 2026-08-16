import React, { lazy, Suspense, useEffect } from 'react';

// Context Hooks
import { useTelegram } from './context/TelegramContext';
import { useUserState, useUserDispatch } from './context/UserContext';
import { useShopState, useShopDispatch } from './context/ShopContext';
import { useCartState, useCartDispatch } from './context/CartContext';
import { useApi } from './hooks/useApi';
import { useTelemetry } from './hooks/useTelemetry';
import { useFeatureFlags } from './context/FeatureFlagContext';
import { useKeyboardVisibility } from './hooks/useKeyboardVisibility';
import { useWishlist } from './hooks/useWishlist';


// Components
import Hero from './components/Hero';
const UserProfile = lazy(() => import('./components/UserProfile'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const WishlistPage = lazy(() => import('./components/WishlistPage'));
import CategoryNavigator from './components/CategoryNavigator';
import PromoBanner from './components/PromoBanner';
import ProductGrid from './components/ProductGrid';
import ProductDetail from './components/ProductDetail';
import CartPage from './components/CartPage';
import ModernBottomNav from './components/ui/ModernBottomNav';
import VideoFeed from './components/VideoFeed';
import SplashScreen from './components/ui/SplashScreen';
import SuccessOverlay from './components/SuccessOverlay';
import InvoiceModal from './components/InvoiceModal';
import ProfileSkeleton from './components/ui/Skeletons/ProfileSkeleton';
import AdminSkeleton from './components/ui/Skeletons/AdminSkeleton';
import ProductSkeleton from './components/ProductSkeleton';
import OfflineBanner from './components/ui/OfflineBanner';
import OfflineService from './services/OfflineService';
import ErrorBoundary from './components/ui/ErrorBoundary';
import FilterModal from './components/ui/FilterModal';
import { parseProductStartParam } from './utils/shareUtils';
const VisualSearchModal = lazy(() => import('./components/ui/VisualSearchModal'));

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

function App() {
  const { tg, HapticFeedback, showAlert, isVersionAtLeast } = useTelegram();
  const { user, theme, lang, isSuperAdmin, t } = useUserState();
  const { 
    setView, setSelectedProduct, setSelectedCategory, setSearchTerm,
    setShopStatus, setDeliveryThreshold, setDeliveryFee, setPromoText, setPromoBannerUrl, setShopLogoUrl,
    setShowFilterModal, setShowScanner, showToast
  } = useShopDispatch();
  const { toggleLang, toggleTheme } = useUserDispatch();
  
  // 📈 Principal: Initialize Telemetry
  useTelemetry();
  
  const { isEnabled } = useFeatureFlags();
  const { 
    view, isSettingsLoaded, shopStatus, products, 
    deliveryThreshold, promoText, promoBannerUrl, selectedCategory, 
    selectedProduct, activeDiscounts, shopLogoUrl, deliveryFee,
    paymentQrUrl, paymentInfo, searchTerm, searchFocused,
    showFilterModal,
    showScanner
  } = useShopState();
  
  const { 
    cart, totalPrice, totalItemsCount, flyingItems, cartIconRef, idempotencyKey 
  } = useCartState();

  const isKeyboardVisible = useKeyboardVisibility();


  const { addToCart, clearCart, updateQty, handleBulkAddToCart, prepareIdempotency } = useCartDispatch();
  const { wishlist, wishlistCount, isFavorited, toggleWishlist } = useWishlist(user?.id);
  const { fetchWithRetry } = useApi();

  // Local state for specific UI interactions not needed in global context
  const [showInvoice, setShowInvoice] = React.useState(false);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [showSplash, setShowSplash] = React.useState(true);
  const [lastOrder, setLastOrder] = React.useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState({});
  const [formData, setFormData] = React.useState(() => {
    try {
      const saved = localStorage.getItem('momo_shipping_info');
      if (!saved) {
        return {
          name: user?.first_name || '',
          phone: '',
          address: '',
          province: '',
          note: '',
          postToTelegram: false,
          deliveryCompany: 'J&T Express'
        };
      }
      const parsed = JSON.parse(saved);
      if (parsed.address?.includes(',') && parsed.province) {
        parsed.province = '';
      }
      return parsed;
    } catch (e) { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('momo_shipping_info', JSON.stringify(formData));
  }, [formData]);

  // 🟢 Online Status Tracking: Ping server every 2 minutes
  useEffect(() => {
    if (!user?.id) return;
    const pingServer = async () => {
      try {
        await fetch(`${BACKEND_URL}/api/ping`, {
          method: 'POST',
          headers: { 'x-tg-data': tg?.initData || '' }
        });
      } catch (err) {
        // Silent fail
      }
    };
    pingServer();
    const interval = setInterval(pingServer, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id, tg?.initData]);

  // 💓 Keep backend warm on Render free tier (public health ping)
  useEffect(() => {
    if (!BACKEND_URL) return;
    const keepAlive = async () => {
      try {
        await fetch(`${BACKEND_URL}/api/alive`, { method: 'GET', keepalive: true });
      } catch (_) {}
    };
    keepAlive();
    const interval = setInterval(keepAlive, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Open product from shared deep link (?startapp=product_123)
  useEffect(() => {
    if (!isSettingsLoaded || !products?.length || !tg) return;
    const startParam = tg.initDataUnsafe?.start_param;
    const productId = parseProductStartParam(startParam);
    if (!productId) return;

    const product = products.find(p => String(p.id) === String(productId));
    if (product) {
      setSelectedProduct(product);
      setView('product_detail');
    }
  }, [isSettingsLoaded, products, tg, setSelectedProduct, setView]);

  // Navigation & BackButton Logic
  useEffect(() => {
    if (!tg) return;
    const handleBack = () => {
      if (view === 'product_detail') setView('browse');
      else if (view === 'wishlist') setView('profile');
      else setView('home');
    };

    if ((view === 'checkout' || view === 'browse' || view === 'product_detail' || view === 'wishlist') && isVersionAtLeast('6.1')) {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
      return () => tg.BackButton.offClick(handleBack);
    } else if (isVersionAtLeast('6.1')) {
      tg.BackButton.hide();
    }
  }, [view, tg, setView, isVersionAtLeast]);

  // Prevent accidental closing if cart has items
  useEffect(() => {
    if (!tg || !isVersionAtLeast('6.2')) return;
    if (cart.length > 0) {
      tg.enableClosingConfirmation();
    } else {
      tg.disableClosingConfirmation();
    }
  }, [cart.length, tg, isVersionAtLeast]);

  const handleToggleWishlist = async (productId) => {
    const id = productId ?? selectedProduct?.id;
    if (id == null) return;
    const added = await toggleWishlist(id);
    HapticFeedback?.impactOccurred('light');
    showToast(
      added
        ? (lang === 'kh' ? 'បានរក្សាទុក — មើលក្នុង Profile → សំណព្វ' : 'Saved — see Profile → Favorites')
        : (lang === 'kh' ? 'បានដកចេញពីសំណព្វ' : 'Removed from favorites')
    );
  };
  
  if (!isSettingsLoaded) {
    return (
      <div className="loading-screen" style={{ background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loader" style={{ borderColor: 'var(--primary-accent)', borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  const handleCheckout = async (finalTotal, couponCode = null) => {
    if (cart.length === 0) return;
    
    const phoneClean = formData.phone.replace(/\s/g, '');
    if (phoneClean.length < 9 || !formData.address?.trim()) {
      setValidationErrors({ 
        phone: phoneClean.length < 9,
        address: !formData.address?.trim()
      });
      HapticFeedback?.notificationOccurred('error');
      setTimeout(() => setValidationErrors({}), 2000);
      return;
    }

    // 🛡️ Persistence Level: Solidify the idempotency key for this attempt
    const currentKey = idempotencyKey || prepareIdempotency();

    const orderData = {
      userId: user?.id,
      userName: user?.first_name || 'Guest',
      items: cart,
      total: finalTotal,
      deliveryInfo: { ...formData, paymentMethod: 'Bakong KHQR' },
      idempotencyKey: currentKey,
      couponCode: couponCode
    };

    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tg-data': tg?.initData || '' },
      body: JSON.stringify(orderData),
      idempotent: true
    };

    if (!navigator.onLine) {
      // 📡 Offline Logic: Queue for sync
      OfflineService.queueRequest(`${BACKEND_URL}/api/orders`, requestOptions);
      showAlert(lang === 'kh' ? 'អ្នកមិនទាន់មានអ៊ីនធឺណិតទេ! ការកម្ម៉ង់ត្រូវបានរក្សាទុក ហើយនឹងផ្ញើទៅពេលអ្នកមានអ៊ីនធឺណិតវិញ។' : 'Offline! Your order is saved and will be sent automatically when you are back online.');
      clearCart(); // Assume success for UX, sync happens in bg
      setView('home');
      return;
    }

    setIsPlacingOrder(true);
    
    // 🚀 Optimistic UI: Show the modal immediately with a "Draft" order 
    // This removes the perceived lag while waiting for the server.
    const draftOrder = {
      id: 'DRAFT',
      order_code: '...',
      total: finalTotal,
      items: cart,
      created_at: new Date().toISOString(),
      status: 'pending'
    };
    setLastOrder(draftOrder);
    setShowInvoice(true);

    const result = await fetchWithRetry(`${BACKEND_URL}/api/orders`, requestOptions);
    setIsPlacingOrder(false);
    
    if (result.success) {
      setLastOrder(result.data.order);
      clearCart();
      return true;
    } else {
      setShowInvoice(false); // Rollback on error
      showAlert(result.error || 'Order Failed');
      return false;
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    HapticFeedback?.notificationOccurred('success');
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      setView('home');
    }, 5000);
  };

  return (
    <ErrorBoundary>
      <div className={`app-container ${isKeyboardVisible ? 'keyboard-visible' : ''}`}>
        
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

        {flyingItems.map(item => (
          <div key={item.id} className="flying-dot-premium" style={{
            '--start-x': `${item.startX}px`, '--start-y': `${item.startY}px`,
            '--end-x': `${item.endX}px`, '--end-y': `${item.endY}px`
          }}/>
        ))}

        {showConfetti && <SuccessOverlay />}
        {showInvoice && (
          <InvoiceModal 
            order={lastOrder} 
            onClose={() => {
              setShowInvoice(false);
              // 🛡️ Cleanup: If user closes the modal, clear the idempotency key 
              // so the next attempt at checkout is fresh and has a full 5-min window.
              if (prepareIdempotency) prepareIdempotency(); 
            }} 
            paymentQrUrl={paymentQrUrl} paymentInfo={paymentInfo}
            BACKEND_URL={BACKEND_URL} 
            onPaymentSuccess={handlePaymentSuccess}
            onCartClear={clearCart}
            t={t} lang={lang}
          />
        )}
        
        {shopStatus === 'closed' && view !== 'admin' && (
          <div className="shop-closed-overlay">
            <div className="closed-card">
               <div className="closed-icon">⏳</div>
               <h2>{t('shop_closed')}</h2>
               <p>{lang === 'kh' ? 'យើងនឹងត្រលប់មកវិញក្នុងពេលឆាប់ៗនេះ' : 'We will be back soon'}</p>
            </div>
          </div>
        )}

        {view === 'admin' ? (
          <Suspense fallback={<AdminSkeleton />}>
            <AdminDashboard 
              BACKEND_URL={BACKEND_URL} 
              setView={setView} 
              theme={theme} 
              setShopStatus={setShopStatus}
              setDeliveryThreshold={setDeliveryThreshold}
              setDeliveryFee={setDeliveryFee}
              setPromoText={setPromoText}
              setPromoBannerUrl={setPromoBannerUrl}
              setShopLogoUrl={setShopLogoUrl}
            />
          </Suspense>
        ) : (
          <>
            {view === 'profile' && (
              <Suspense fallback={<ProfileSkeleton />}>
                <UserProfile user={user} setView={setView} BACKEND_URL={BACKEND_URL} onViewInvoice={(o) => { setLastOrder(o); setShowInvoice(true); }} t={t} lang={lang} toggleLang={toggleLang} theme={theme} toggleTheme={toggleTheme} products={products} handleBulkAddToCart={handleBulkAddToCart} wishlistCount={wishlistCount} />
              </Suspense>
            )}
            {view === 'wishlist' && (
              <Suspense fallback={<div className="p-5"><div className="h-40 bg-bg-soft rounded-3xl animate-pulse"></div></div>}>
                <WishlistPage
                  wishlist={wishlist}
                  products={products}
                  onAdd={addToCart}
                  onViewProduct={(p) => { setSelectedProduct(p); setView('product_detail'); }}
                  onToggleWishlist={handleToggleWishlist}
                  activeDiscounts={activeDiscounts}
                  handleBulkAddToCart={handleBulkAddToCart}
                  setView={setView}
                  t={t}
                  lang={lang}
                />
              </Suspense>
            )}
            {(view === 'home' || view === 'browse') && (
              <div className="animate-in">
                <Hero searchTerm={searchTerm} setSearchTerm={setSearchTerm} view={view} setView={setView} user={user} lang={lang} theme={theme} toggleLang={toggleLang} toggleTheme={toggleTheme} isKeyboardVisible={isKeyboardVisible} t={t} />
                {!(view === 'browse' && (searchTerm.trim() || searchFocused)) && (
                  <PromoBanner threshold={deliveryThreshold} promoText={promoText} promoBannerUrl={promoBannerUrl} t={t} lang={lang} />
                )}
                {view === 'browse' && !searchFocused && (
                  <CategoryNavigator searchTerm={searchTerm} setSearchTerm={setSearchTerm} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} t={t} />
                )}
                <ProductGrid />
              </div>
            )}
            {view === 'checkout' && (
              <CartPage 
                formData={formData} 
                setFormData={setFormData} 
                onPhoneChange={(val) => {
                  const cleaned = val.replace(/\D/g, '').slice(0, 10);
                  let formatted = cleaned;
                  if (cleaned.length > 3 && cleaned.length <= 6) {
                    formatted = `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
                  } else if (cleaned.length > 6) {
                    formatted = `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
                  }
                  setFormData(prev => ({ ...prev, phone: formatted }));
                }} 
                isPhoneValid={formData.phone.replace(/\s/g, '').length >= 9} 
                isAddressValid={!!formData.address?.trim()}
                validationErrors={validationErrors} 
                onCheckout={handleCheckout} 
                isPlacingOrder={isPlacingOrder} 
              />
            )}
            {view === 'feed' && (
              <VideoFeed 
                products={products} 
                onProductSelect={(p) => { setSelectedProduct(p); setView('product_detail'); }} 
                onAddToCart={addToCart} 
              />
            )}

          </>
        )}

        {view === 'product_detail' && selectedProduct && (
          <ProductDetail
            product={selectedProduct}
            allProducts={products}
            onAdd={addToCart}
            onClose={() => setView('browse')}
            onBuyNow={() => setView('checkout')}
            activeDiscounts={activeDiscounts}
            t={t}
            lang={lang}
            shopLogoUrl={shopLogoUrl}
            onSelectRelated={(p) => setSelectedProduct(p)}
            isFavorited={isFavorited(selectedProduct.id)}
            onToggleWishlist={() => handleToggleWishlist(selectedProduct.id)}
          />
        )}

        <FilterModal />
        {showScanner && (
        <Suspense fallback={<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 text-white backdrop-blur-md">Loading AI Engine...</div>}>
          <VisualSearchModal onClose={() => setShowScanner(false)} />
        </Suspense>
      )}
        <ModernBottomNav view={view} setView={setView} cartCount={totalItemsCount} isAdmin={isSuperAdmin} t={t} lang={lang} isKeyboardVisible={isKeyboardVisible} />
        <OfflineBanner />
      </div>
    </ErrorBoundary>
  );
}

export default App;
