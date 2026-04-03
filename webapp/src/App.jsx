import React, { useEffect, useState } from 'react';
import './App.css';

// Components
import Header from './components/Header';
import ProductCard from './components/ProductCard';
import CartItem from './components/CartItem';
import DeliveryForm from './components/DeliveryForm';
import OrderSummary from './components/OrderSummary';
import PillFooter from './components/PillFooter';
import AdminDashboard from './components/AdminDashboard';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); // 'home' or 'checkout'
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [formData, setFormData] = useState({ phone: '', address: '' });

  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#ffffff');
    tg.setBackgroundColor('#ffffff');

    const initData = tg.initData;
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
          fetchProducts();
          fetchUserInfo(data.user.id);
        }
        setIsVerifying(false);
      })
      .catch(() => setIsVerifying(false));
    } else {
      setIsVerifying(false);
    }
  }, []);

  const fetchProducts = () => {
    fetch(`${BACKEND_URL}/api/products`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setProducts(data.products);
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

  const handleAddToCart = (product) => {
    if (product.stock !== undefined && product.stock <= 0) {
       window.Telegram.WebApp.showAlert('ទំនិញនេះអស់ស្តុកហើយ! (Out of stock)');
       return;
    }

    const tg = window.Telegram.WebApp;
    tg.HapticFeedback.impactOccurred('medium');
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (product.stock !== undefined && existing.quantity >= product.stock) {
          tg.showAlert(`សុំទោស ទំនិញនេះមានស្តុកត្រឹមតែ ${product.stock} ប៉ុណ្ណោះ។`);
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    
    setView('checkout');
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        let newQty = Math.max(1, item.quantity + delta);
        if (item.stock !== undefined && newQty > item.stock) {
          window.Telegram.WebApp.showAlert(`សុំទោស ទំនិញនេះមានស្តុកត្រឹមតែ ${item.stock} ប៉ុណ្ណោះ។ (Max stock reached)`);
          newQty = item.stock;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
  };

  const clearCart = () => {
    setCart([]);
    setView('home');
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const tg = window.Telegram.WebApp;
    
    if (!formData.phone || !formData.address) {
      tg.showAlert('សូមបំពេញលេខទូរស័ព្ទ និងអាស័យដ្ឋាន! (Please fill phone and address)');
      tg.HapticFeedback.notificationOccurred('error');
      return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    tg.showConfirm('តើអ្នកចង់បញ្ជាក់ការបញ្ជាទិញមែនទេ? (Confirm order?)', (ok) => {
      if (ok) {
        fetch(`${BACKEND_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            userName: user?.first_name,
            items: cart,
            total: total,
            deliveryInfo: formData
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            tg.showAlert('ការបញ្ជាទិញទទួលបានជោគជ័យ! (Order Successful)');
            setCart([]);
            setView('home');
          }
        });
      }
    });
  };

  if (isVerifying) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>កំពុងផ្ទៀងផ្ទាត់...</p>
      </div>
    );
  }

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="app-container">
      {/* 1. Global Navigation Header */}
      <header className="main-header">
        <button className="back-btn" onClick={() => isAdminMode ? setIsAdminMode(false) : setView('home')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <h1 className="app-title">{isAdminMode ? 'Admin Center' : (view === 'home' ? 'replicaaroma' : 'បញ្ជាក់ការបញ្ជាទិញ')}</h1>
        {isSuperAdmin ? (
          <button className="back-btn" onClick={() => setIsAdminMode(!isAdminMode)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isAdminMode ? "var(--primary-teal)" : "#64748b"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </button>
        ) : (
          <div style={{ width: 44 }}></div>
        )}
      </header>

      {isAdminMode ? (
        <AdminDashboard BACKEND_URL={BACKEND_URL} />
      ) : (
        <>
          {/* 2. Customer View Content */}
          <Header view={view} setView={setView} cartCount={cart.length} hideGlobalHeader={true} />

          {view === 'home' ? (
            <>
              <div className="brand-name">replicaaroma</div>
              <section className="search-container">
                <div className="search-icon-fixed">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="ស្វែងរកទំនិញ"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </section>

              <main className="products-grid">
                {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
                  <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />
                ))}
              </main>
            </>
          ) : (
            <main className="checkout-section scroller-checkout">
              <div className="trash-btn-wrapper" onClick={clearCart}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                លុបទំនិញដែលបានកុម្ម៉ង់
              </div>

              <div className="cart-list-modern">
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e0" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    <p style={{ color: '#94a3b8' }}>មិនទាន់មានទំនិញក្នុងកន្ត្រកទេ (Cart is empty)</p>
                    <button onClick={() => setView('home')} style={{ background: 'var(--primary-teal)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', marginTop: 10 }}>ទៅទិញទំនិញ (Shop Now)</button>
                  </div>
                ) : (
                  cart.map(item => (
                    <CartItem key={item.id} item={item} updateQty={updateQty} />
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <>
                  <DeliveryForm user={user} formData={formData} setFormData={setFormData} />
                  <OrderSummary totalPrice={totalPrice} />
                  <div className="payment-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="aba-logo-placeholder" style={{ background: '#005a8d', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>ABA</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>ABA KHQR</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Scan to pay with any banking app</div>
                      </div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#01ba9d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </>
              )}
            </main>
          )}

          {/* 3. Global Pill Footer (Only visible in Customer Mode) */}
          <PillFooter view={view} setView={setView} totalPrice={totalPrice} onPay={handleCheckout} />
        </>
      )}
    </div>
  );
}

export default App;
