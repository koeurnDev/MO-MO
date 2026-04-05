import React, { useEffect, useState, lazy, Suspense, useCallback } from 'react';
import './App.css';

// Components
import Hero from './components/Hero';
import CategoryNavigator from './components/CategoryNavigator';
import PromoBanner from './components/PromoBanner';
import ProductGrid from './components/ProductGrid';
import CartPage from './components/CartPage';
import PillFooter from './components/PillFooter';
import SuccessOverlay from './components/SuccessOverlay';
import InvoiceModal from './components/InvoiceModal';

const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const UserProfile = React.lazy(() => import('./components/UserProfile'));

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); 
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [shopStatus, setShopStatus] = useState('open'); 
  const [deliveryThreshold, setDeliveryThreshold] = useState('50'); 
  const [deliveryFee, setDeliveryFee] = useState('1.50');
  const [promoText, setPromoText] = useState('');
  const [paymentQrUrl, setPaymentQrUrl] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [formData, setFormData] = useState({ phone: '', address: '' });
  const [activeDiscounts, setActiveDiscounts] = useState([]);

  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    const isAtLeast61 = tg.isVersionAtLeast ? tg.isVersionAtLeast('6.1') : false;

    if (isAtLeast61) {
      if (tg.setHeaderColor) tg.setHeaderColor('#ff72a0'); 
      if (tg.setBackgroundColor) tg.setBackgroundColor('#fff5f7');
    }

    // 🛍 Fetch public data
    fetchProducts();
    fetchShopStatus();
    fetchDeliveryThreshold();
    fetchDeliveryFee();
    fetchPromoText();
    fetchPaymentQrUrl();
    fetchPaymentInfo();
    fetchActiveDiscounts();

    const initData = tg.initData;
    
    // 🔙 Telegram BackButton Logic
    if (isAtLeast61 && tg.BackButton) {
      const handleBack = () => setView('home');
      tg.BackButton.onClick(handleBack);
      if (view !== 'home') tg.BackButton.show();
      else tg.BackButton.hide();
    }

    if (initData) {
      fetch(`${BACKEND_URL}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
          setIsSuperAdmin(data.isAdmin);
          fetchUserInfo(data.user.id);
        }
        setIsVerifying(false);
      })
      .catch(() => setIsVerifying(false));
    } else {
      setIsSuperAdmin(true);
      setIsVerifying(false);
    }
  }, []);

  const fetchShopStatus = () => {
    fetch(`${BACKEND_URL}/api/settings/shop_status`)
      .then(res => res.json())
      .then(data => { if (data.success) setShopStatus(data.status); });
  };

  const fetchDeliveryThreshold = () => {
    fetch(`${BACKEND_URL}/api/settings/delivery_threshold`)
      .then(res => res.json())
      .then(data => { if (data.success) setDeliveryThreshold(data.threshold); });
  };

  const fetchDeliveryFee = () => {
    fetch(`${BACKEND_URL}/api/settings/delivery_fee`)
      .then(res => res.json())
      .then(data => { if (data.success) setDeliveryFee(data.fee); });
  };

  const fetchPromoText = () => {
    fetch(`${BACKEND_URL}/api/settings/promo_text`)
      .then(res => res.json())
      .then(data => { if (data.success) setPromoText(data.promoText); });
  };
  
  const fetchPaymentQrUrl = () => {
    fetch(`${BACKEND_URL}/api/settings/payment_qr_url`)
      .then(res => res.json())
      .then(data => { if (data.success) setPaymentQrUrl(data.value); });
  };
  
  const fetchPaymentInfo = () => {
    fetch(`${BACKEND_URL}/api/settings/payment_info`)
      .then(res => res.json())
      .then(data => { if (data.success) setPaymentInfo(data.value); });
  };

  const fetchProducts = () => {
    fetch(`${BACKEND_URL}/api/products`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setProducts(data.products);
      });
  };

  const fetchActiveDiscounts = () => {
    fetch(`${BACKEND_URL}/api/active_discounts`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setActiveDiscounts(data.discounts);
      });
  };

  const fetchUserInfo = (userId) => {
    fetch(`${BACKEND_URL}/api/user/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setFormData({
            phone: data.user.phone || '',
            address: data.user.address || ''
          });
        }
      });
  };

  // ⚡ Optimized Callback for AddToCart to avoid unnecessary re-renders
  const handleAddToCart = useCallback((product) => {
    if (shopStatus === 'closed') return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setView('checkout');
  }, [shopStatus]);

  const updateQty = useCallback((id, delta) => {
    setCart(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, quantity: item.quantity + delta } : item);
      return updated.filter(item => item.quantity > 0);
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setView('home');
  }, []);

  const handleCheckout = (finalTotal) => {
    if (cart.length === 0) return;
    setIsPlacingOrder(true);
    fetch(`${BACKEND_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        userName: user?.first_name,
        items: cart,
        total: finalTotal,
        deliveryInfo: formData
      })
    })
    .then(res => res.json())
    .then(data => {
      setIsPlacingOrder(false);
      if (data.success) {
        setLastOrder(data.order);
        setShowInvoice(true);
      }
    })
    .catch(() => setIsPlacingOrder(false));
  };

  const handlePaymentSuccess = () => {
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      setCart([]);
      setView('home');
    }, 5000);
  };

  useEffect(() => {
    setIsAdminMode(view === 'admin');
  }, [view]);

  if (isVerifying) {
    return <div className="loading-screen"><div className="loader"></div></div>;
  }

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="app-container">
      {showConfetti && <SuccessOverlay />}
      {showInvoice && (
        <InvoiceModal 
          order={lastOrder} 
          onClose={() => setShowInvoice(false)} 
          paymentQrUrl={paymentQrUrl}
          paymentInfo={paymentInfo}
          BACKEND_URL={BACKEND_URL}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
      
      {shopStatus === 'closed' && view !== 'admin' && (
        <div className="shop-closed-overlay">
          <div className="closed-card">
             <div className="closed-icon">⏳</div>
             <h2>ហាងកំពុងសម្រាក</h2>
             <p>យើងនឹងត្រលប់មកវិញក្នុងពេលឆាប់ៗនេះ។ សូមអរគុណ!</p>
          </div>
        </div>
      )}

      {isAdminMode ? (
        <div className="animate-in" style={{ padding: '20px' }}>
          <Suspense fallback={<div className="loading-screen"><div className="loader"></div></div>}>
            <AdminDashboard BACKEND_URL={BACKEND_URL} setView={(v) => { setView(v); setIsAdminMode(false); }} />
          </Suspense>
        </div>
      ) : (
        <>
          {view === 'profile' && (
             <Suspense fallback={<div className="loading-screen"><div className="loader"></div></div>}>
                <UserProfile user={user} setView={setView} BACKEND_URL={BACKEND_URL} onViewInvoice={(order) => { setLastOrder(order); setShowInvoice(true); }} />
             </Suspense>
          )}

          {view === 'home' || view === 'browse' ? (
            <div className="animate-in">
              <Hero user={user} setView={setView} isAdmin={isSuperAdmin} />
              {(view === 'home' || view === 'browse') && <PromoBanner threshold={deliveryThreshold} promoText={promoText} />}
              
              {view === 'browse' && (
                 <div style={{ padding: '20px' }}>
                    <CategoryNavigator searchTerm={searchTerm} setSearchTerm={setSearchTerm} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
                 </div>
              )}

              <ProductGrid products={products} searchTerm={searchTerm} selectedCategory={selectedCategory} onAdd={handleAddToCart} activeDiscounts={activeDiscounts} />
            </div>
          ) : (
            <CartPage cart={cart} updateQty={updateQty} clearCart={clearCart} user={user} formData={formData} setFormData={setFormData} totalPrice={totalPrice} setView={setView} BACKEND_URL={BACKEND_URL} onCheckout={handleCheckout} activeDiscounts={activeDiscounts} deliveryThreshold={deliveryThreshold} deliveryFee={deliveryFee} isPlacingOrder={isPlacingOrder} />
          )}
        </>
      )}

      <PillFooter view={view} setView={setView} totalPrice={totalPrice} hidePay={true} isAdmin={isSuperAdmin} />
    </div>
  );
}

export default App;
