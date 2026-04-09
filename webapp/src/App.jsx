import React, { lazy, Suspense, useEffect } from 'react';
import './App.css';

// Context Hooks
import { useTelegram } from './context/TelegramContext';
import { useUserState, useUserDispatch } from './context/UserContext';
import { useShopState, useShopDispatch } from './context/ShopContext';
import { useCartState, useCartDispatch } from './context/CartContext';
import { useApi } from './hooks/useApi';
import { useTelemetry } from './hooks/useTelemetry';
import { useFeatureFlags } from './context/FeatureFlagContext';

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
import PillFooter from './components/PillFooter';
import SuccessOverlay from './components/SuccessOverlay';
import InvoiceModal from './components/InvoiceModal';
import ProfileSkeleton from './components/ui/Skeletons/ProfileSkeleton';
import AdminSkeleton from './components/ui/Skeletons/AdminSkeleton';
import ProductSkeleton from './components/ProductSkeleton';
import OfflineBanner from './components/ui/OfflineBanner';
import OfflineService from './services/OfflineService';
import ErrorBoundary from './components/ui/ErrorBoundary';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

function App() {
  const { tg, isVersionAtLeast, showAlert } = useTelegram();
  const { user, theme, lang, isSuperAdmin, t } = useUserState();
  const { 
    setView, setSelectedProduct, setSelectedCategory, setSearchTerm,
    setShopStatus, setDeliveryThreshold, setDeliveryFee, setPromoText, setPromoBannerUrl, setShopLogoUrl
  } = useShopDispatch();
  const { toggleLang, toggleTheme } = useUserDispatch();
  
  // 📈 Principal: Initialize Telemetry
  useTelemetry();
  
  const { isEnabled } = useFeatureFlags();
  const { 
    view, isSettingsLoaded, shopStatus, products, 
    deliveryThreshold, promoText, promoBannerUrl, selectedCategory, 
    selectedProduct, activeDiscounts, shopLogoUrl, deliveryFee,
    paymentQrUrl, paymentInfo, searchTerm
  } = useShopState();
  
  const { 
    cart, totalPrice, totalItemsCount, flyingItems, cartIconRef, idempotencyKey 
  } = useCartState();

  const { addToCart, clearCart, updateQty, handleBulkAddToCart, prepareIdempotency } = useCartDispatch();

  // Local state for specific UI interactions not needed in global context
  const [showInvoice, setShowInvoice] = React.useState(false);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [lastOrder, setLastOrder] = React.useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState({});
  const [formData, setFormData] = React.useState(() => {
    try {
      const saved = localStorage.getItem('momo_shipping_info');
      return saved ? JSON.parse(saved) : {
        name: user?.first_name || '',
        phone: '',
        address: '',
        province: 'Phnom Penh',
        note: '',
        postToTelegram: false,
        deliveryCompany: 'J&T Express'
      };
    } catch (e) { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('momo_shipping_info', JSON.stringify(formData));
  }, [formData]);

  // Navigation & BackButton Logic
  useEffect(() => {
    if (!tg) return;
    const handleBack = () => setView('home');

    if ((view === 'checkout' || view === 'browse' || view === 'product_detail' || view === 'wishlist') && isVersionAtLeast('6.1')) {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
      return () => tg.BackButton.offClick(handleBack);
    } else if (isVersionAtLeast('6.1')) {
      tg.BackButton.hide();
    }
  }, [view, tg, setView, isVersionAtLeast]);

  const { fetchWithRetry, loading: isApiLoading } = useApi();
  
  if (!isSettingsLoaded) {
    return (
      <div className="loading-screen" style={{ background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loader" style={{ borderColor: 'var(--primary-accent)', borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  const handleCheckout = async (finalTotal) => {
    if (cart.length === 0) return;
    
    const phoneClean = formData.phone.replace(/\s/g, '');
    if (phoneClean.length < 9 || !formData.address?.trim()) {
      setValidationErrors({ 
        phone: phoneClean.length < 9,
        address: !formData.address?.trim()
      });
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
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
      idempotencyKey: currentKey
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
      // Modal will automatically update via setLastOrder
    } else {
      setShowInvoice(false); // Rollback on error
      showAlert(result.error || 'Order Failed');
    }
  };

  const handleConfirmPayment = async (orderCode) => {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    const result = await fetchWithRetry(`${BACKEND_URL}/api/orders/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-TG-Data': window.Telegram?.WebApp?.initData || '' },
      body: JSON.stringify({ orderCode })
    });
    
    if (result.success) {
      handlePaymentSuccess();
      return true;
    } else {
      tg?.showAlert(result.error || 'Confirmation Failed');
      return false;
    }
  };
  const handlePaymentSuccess = () => {
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      clearCart();
      setView('home');
    }, 5000);
  };

  return (
    <ErrorBoundary>
      <div className="app-container">
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
            onConfirmPayment={handleConfirmPayment}
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
                <UserProfile user={user} setView={setView} BACKEND_URL={BACKEND_URL} onViewInvoice={(o) => { setLastOrder(o); setShowInvoice(true); }} t={t} lang={lang} toggleLang={toggleLang} theme={theme} toggleTheme={toggleTheme} products={products} handleBulkAddToCart={handleBulkAddToCart} />
              </Suspense>
            )}
            {view === 'wishlist' && isEnabled('BETA_WISH_LIST') && (
              <Suspense fallback={<div className="p-5"><div className="h-40 bg-bg-soft rounded-3xl animate-pulse"></div></div>}>
                <WishlistPage products={products} onAdd={addToCart} setView={setView} t={t} lang={lang} />
              </Suspense>
            )}
            {view === 'wishlist' && !isEnabled('BETA_WISH_LIST') && (
              <div className="p-8 text-center text-muted">Coming Soon...</div>
            )}
            {(view === 'home' || view === 'browse') && (
              <div className="animate-in">
                <Hero />
                <PromoBanner threshold={deliveryThreshold} promoText={promoText} promoBannerUrl={promoBannerUrl} t={t} lang={lang} />
                {view === 'browse' && <CategoryNavigator searchTerm={searchTerm} setSearchTerm={setSearchTerm} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} t={t} />}
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

          </>
        )}

        {view === 'product_detail' && selectedProduct && (
          <ProductDetail product={selectedProduct} allProducts={products} onAdd={addToCart} onClose={() => setView('home')} onBuyNow={(e) => { addToCart(selectedProduct, e); setView('checkout'); }} activeDiscounts={activeDiscounts} t={t} lang={lang} shopLogoUrl={shopLogoUrl} />
        )}

        <PillFooter view={view} setView={setView} totalPrice={totalPrice} isAdmin={isSuperAdmin} cartCount={totalItemsCount} t={t} lang={lang} />
        <OfflineBanner />
      </div>
    </ErrorBoundary>
  );
}

export default App;
