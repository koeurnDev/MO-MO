import React, { useEffect, useState, useMemo, useCallback } from 'react';
import AdminSkeleton from './AdminSkeleton';
import { useTelegram } from '../context/TelegramContext';
import { useQuery } from '../hooks/useQuery';
import { useApi } from '../hooks/useApi';
import ProductDetail from './ProductDetail';

const AdminDashboard = ({ 
  BACKEND_URL, 
  setView, 
  setPromoBannerUrl: setGlobalPromoBannerUrl, 
  setPromoText: setGlobalPromoText, 
  setShopStatus: setGlobalShopStatus, 
  setDeliveryFee: setGlobalDeliveryFee, 
  setDeliveryThreshold: setGlobalDeliveryThreshold,
  setShopLogoUrl: setGlobalShopLogoUrl,
  theme
}) => {
  const { tg, initData, showAlert: tgShowAlert } = useTelegram();
  const { fetchWithRetry } = useApi();
  const headers = useMemo(() => ({ 'X-TG-Data': initData || '' }), [initData]);


  const [activeTab, setActiveTab] = useState('overview'); 
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderFilter, setOrderFilter] = useState('all'); 
  const [trackingNumbers, setTrackingNumbers] = useState({});
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  
  // 🛰️ Data Fetching with in-flight protection
  const { 
    data: summaryData, 
    loading: summaryLoading, 
    refetch: refetchSummary 
  } = useQuery('admin-summary', `${BACKEND_URL}/api/admin/summary`, { headers });

  const { 
    data: ordersData, 
    loading: ordersLoading, 
    refetch: refetchOrders 
  } = useQuery('admin-orders', `${BACKEND_URL}/api/admin/orders`, { headers });

  const { 
    data: analyticsData, 
    loading: analyticsLoading, 
    refetch: refetchAnalytics 
  } = useQuery('admin-analytics', `${BACKEND_URL}/api/admin/analytics`, { headers });

  const { 
    data: productsData, 
    loading: productsLoading, 
    refetch: refetchProducts 
  } = useQuery('products', `${BACKEND_URL}/api/products`, {});

  const { 
    data: categoriesData, 
    loading: categoriesLoading, 
    refetch: refetchCategories 
  } = useQuery('admin-categories', `${BACKEND_URL}/api/admin/categories`, { headers });

  const { 
    data: settingsData, 
    loading: settingsLoading, 
    refetch: refetchSettings 
  } = useQuery('admin-settings', `${BACKEND_URL}/api/admin/settings`, { headers });

  // Derived state from queries (admin endpoints return full response; useQuery stores result.data)
  const summary = summaryData || { totalRevenue: 0, totalOrders: 0, activeOrders: 0, totalCustomers: 0, businessHealth: 100 };
  const orders = ordersData?.orders || [];
  const analytics = analyticsData ? { daily: analyticsData.daily || [], status: analyticsData.status || [] } : { daily: [], status: [] };
  const products = productsData?.products || [];
  const categories = categoriesData?.categories || [];
  
  // Settings specific state
  const [shopStatus, setShopStatus] = useState('open');
  const [deliveryThreshold, setDeliveryThreshold] = useState('50');
  const [deliveryFee, setDeliveryFee] = useState('1.50');
  const [promoText, setPromoText] = useState('');
  const [promoBannerUrl, setPromoBannerUrl] = useState('');
  const [shopLogoUrl, setShopLogoUrl] = useState('');

  useEffect(() => {
    if (settingsData?.success) {
      const s = settingsData.settings;
      setShopStatus(s.shop_status || 'open');
      setDeliveryThreshold(s.delivery_threshold || '50');
      setDeliveryFee(s.delivery_fee || '1.50');
      setPromoText(s.promo_text || '');
      setPromoBannerUrl(s.promo_banner_url || '');
      setShopLogoUrl(s.shop_logo_url || '');
    }
  }, [settingsData]);

  const loading = (activeTab === 'overview' && (summaryLoading || ordersLoading || analyticsLoading)) ||
                  (activeTab === 'orders' && ordersLoading) ||
                  (activeTab === 'products' && (productsLoading || categoriesLoading)) ||
                  (activeTab === 'settings' && settingsLoading);


  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastImage, setBroadcastImage] = useState('');

  const [editingProduct, setEditingProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', price: '', stock: '' });
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductData, setNewProductData] = useState({ 
    name: '', price: '', stock: '', category: 'ទឹកអប់ (Perfume)', 
    image: '', description: '', additional_images: [] 
  });

  const [confirmDialog, setConfirmDialog] = useState(null); // Now used for BeautyModal
  const [printingOrder, setPrintingOrder] = useState(null);

  const refetchData = useCallback((isBackground = false) => {
    if (activeTab === 'overview') {
       refetchSummary();
       refetchOrders();
       refetchAnalytics();
    } else if (activeTab === 'orders') {
       refetchOrders();
    } else if (activeTab === 'products') {
       refetchProducts();
       refetchCategories();
    } else if (activeTab === 'settings') {
       refetchSettings();
    }
  }, [activeTab, refetchSummary, refetchOrders, refetchAnalytics, refetchProducts, refetchCategories, refetchSettings]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refetchData(true);
      }
    }, 45000); // Increased interval to 45s for stability
    return () => clearInterval(interval);
  }, [refetchData]);

  const updateStatus = async (orderId, status) => {
    const trackingNumber = trackingNumbers[orderId] || '';
    
    fetchWithRetry(`${BACKEND_URL}/api/admin/orders/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ orderId, status, trackingNumber })
    }).then(() => {
        setToastMessage('បច្ចុប្បន្នភាពជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2500);
        
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('success');
        
        setTrackingNumbers(prev => {
          const next = {...prev};
          delete next[orderId];
          return next;
        });
        refetchData(true);
    });
  };

  const showAlert = (msg) => {
    setConfirmDialog({ 
      text: msg, 
      onConfirm: () => setConfirmDialog(null), 
      isAlert: true,
      icon: '✨'
    });
  };

  const showConfirm = (msg, onConfirm, icon = '❓') => {
    setConfirmDialog({
      text: msg,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null),
      isAlert: false,
      icon
    });
  };

  const submitAddProduct = async () => {
    if(!newProductData.name || !newProductData.price) return showAlert('សូមបំពេញឈ្មោះ និងតម្លៃ!');
    setIsSaving(true);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          ...newProductData,
          price: parseFloat(newProductData.price),
          stock: parseInt(newProductData.stock) || 0,
          additional_images: JSON.stringify(newProductData.additional_images || [])
        })
      });
      if (res.success) {
        setIsAddingProduct(false);
        setNewProductData({ name: '', price: '', stock: '', category: 'ទឹកអប់ (Perfume)', image: '', description: '', additional_images: [] });
        refetchData(true);
        setToastMessage('បន្ថែមទំនិញបានជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2500);
      }
    } finally { setIsSaving(false); }
  };

  const submitEditProduct = async () => {
    if(!editingProduct) return;
    setIsSaving(true);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ 
          ...editingProduct, 
          ...editFormData, 
          price: parseFloat(editFormData.price), 
          stock: parseInt(editFormData.stock),
          additional_images: JSON.stringify(editFormData.additional_images || [])
        })
      });
      if (res.success) {
        setEditingProduct(null);
        refetchData(true);
        setToastMessage('កែប្រែទំនិញជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2000);
      }
    } catch (err) { showAlert('Error: ' + err.message); }
    finally { setIsSaving(false); }
  };

  const handleBroadcastUpload = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers: headers, body: formData });
      if (res.success) setBroadcastImage(res.data?.url);
    } finally { }
  };

  const handlePreview = (data) => {
    // Transform form data into product object structure for ProductDetail component
    const mockProduct = {
      ...data,
      id: 9999,
      price: parseFloat(data.price) || 0,
      stock: parseInt(data.stock) || 0,
    };
    setPreviewData(mockProduct);
    setIsPreviewing(true);
  };
  const handleBroadcast = async () => {
    if (!broadcastMsg.trim() && !broadcastImage) return;
    setIsBroadcasting(true);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ message: broadcastMsg, photoUrl: broadcastImage })
      });
      if (res.success) {
        setToastMessage(`📢 បានផ្ញើដំណឹងដល់អតិថិជន ${res.data?.count || 0} នាក់!`);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
        setBroadcastMsg('');
        setBroadcastImage('');
      }
    } finally { setIsBroadcasting(false); }
  };

  const updateSettingValue = async (key, value) => {
    fetchWithRetry(`${BACKEND_URL}/api/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ key, value })
    }).then(data => {
      if (data.success) {
        setToastMessage('រក្សាទុកជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2500);
        if (key === 'shop_status') setGlobalShopStatus(value);
        if (key === 'promo_text') setGlobalPromoText(value);
        if (key === 'delivery_fee') setGlobalDeliveryFee(value);
        if (key === 'delivery_threshold') setGlobalDeliveryThreshold(value);
        if (key === 'shop_logo_url') setGlobalShopLogoUrl(value);
      }
    });
  };

  const handleBannerUpload = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers: headers, body: formData });
      if (res.success) {
        await updateSettingValue('promo_banner_url', res.url);
        setPromoBannerUrl(res.url);
        setGlobalPromoBannerUrl(res.url);
      }
    } finally { }
  };

  const handleLogoUpload = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const tgData = window.Telegram?.WebApp?.initData || '';
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers: { 'X-TG-Data': tgData }, body: formData });
      const data = await res.json();
      if (data.success) {
        await updateSettingValue('shop_logo_url', data.url);
        setShopLogoUrl(data.url);
        setGlobalShopLogoUrl(data.url);
      }
    } finally { }
  };

  const statusTags = {
    'pending': { label: 'រង់ចាំបង់', color: '#64748b', icon: '⏳' },
    'paid': { label: 'បង់រួច', color: '#10b981', icon: '✅' },
    'processing': { label: 'រៀបចំអីវ៉ាន់', color: '#f59e0b', icon: '📦' },
    'shipped': { label: 'អីវ៉ាន់បានចេញ', color: '#a855f7', icon: '✨' },
    'delivering': { label: 'ប្រគល់ឱ្យដឹកជញ្ជូន', color: '#10b981', icon: '🚚' },
    'delivered': { label: 'បានដល់ដៃ', color: '#10b981', icon: '🏠' }
  };

  return (
    <>
      {printingOrder && <PrintableOrder order={printingOrder} />}
      <div className="admin-dashboard-overhaul animate-in no-print" style={{ paddingBottom: 100 }}>
        <style>{`
          :root {
            --bg-midnight: #020617;
            --glass-card: rgba(15, 23, 42, 0.7);
            --glass-border: rgba(255, 255, 255, 0.08);
            --rose-gradient: linear-gradient(135deg, #f472b6 0%, #db2777 100%);
            --nebula-gradient: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
            --text-luxury: #f8fafc;
            --text-dim: #94a3b8;
            --admin-shadow: 0 20px 50px -12px rgba(0,0,0,0.8);
            --primary-accent: #f472b6;
            --gold-glow: 0 0 20px rgba(244, 114, 182, 0.3);
          }
          [data-theme='light'] {
            --bg-midnight: #f1f5f9;
            --glass-card: rgba(255, 255, 255, 0.9);
            --glass-border: rgba(0, 0, 0, 0.05);
            --text-luxury: #0f172a;
            --text-dim: #64748b;
            --admin-shadow: 0 15px 35px -10px rgba(0,0,0,0.1);
          }
          .admin-dashboard-overhaul { 
            background: var(--bg-midnight); 
            min-height: 100vh; 
            color: var(--text-luxury); 
            font-family: 'Kantumruy Pro', 'Inter', sans-serif; 
            transition: all 0.5s ease;
          }
          .admin-header-luxury { 
            background: var(--glass-card); 
            border: 1px solid var(--glass-border); 
            border-radius: 32px; 
            padding: 22px 28px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin: 20px 16px 30px 16px; 
            backdrop-filter: blur(30px); 
            box-shadow: var(--admin-shadow); 
          }
          .admin-title-pro { 
            margin: 0; 
            font-size: 22px; 
            font-weight: 950; 
            letter-spacing: -0.8px;
            background: linear-gradient(135deg, var(--text-luxury) 0%, var(--primary-accent) 150%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            drop-shadow: 0 4px 10px rgba(0,0,0,0.1);
          }
          
          .back-btn-pill { 
            background: var(--glass-card); 
            border: 1px solid var(--glass-border); 
            border-radius: 20px; 
            padding: 8px 20px; 
            font-size: 13px; 
            font-weight: 900; 
            color: var(--text-luxury); 
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
            backdrop-filter: blur(20px); 
            cursor: pointer;
            min-height: 48px; 
            display: flex; 
            align-items: center;
            box-shadow: var(--shadow-soft);
          }
          .back-btn-pill:hover { 
            background: var(--bg-midnight);
            border-color: #ef4444;
            color: #ef4444;
            transform: translateY(-3px) scale(1.03); 
            box-shadow: 0 12px 24px -5px rgba(239, 68, 68, 0.2);
          }

          .input-glass-admin { 
            width: 100%; 
            background: rgba(255, 255, 255, 0.04); 
            border: 1.5px solid var(--glass-border); 
            border-radius: 18px; 
            color: var(--text-luxury); 
            padding: 16px 20px; 
            outline: none; 
            transition: all 0.3s ease; 
          }
          .input-glass-admin:focus { 
            border-color: var(--primary-accent); 
            background: rgba(255, 255, 255, 0.07); 
            box-shadow: 0 0 25px -5px rgba(244, 114, 182, 0.25); 
            transform: translateY(-1px);
          }
          
          .ticket-btn-primary { 
            background: var(--rose-gradient); 
            color: white; 
            border: none; 
            border-radius: 22px; 
            padding: 18px 26px; 
            font-weight: 950; 
            font-size: 15px; 
            box-shadow: 0 12px 25px -5px rgba(219, 39, 119, 0.4); 
            cursor: pointer; 
            width: 100%; 
            transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 10px;
          }
          .ticket-btn-primary:hover { 
            transform: translateY(-4px); 
            box-shadow: 0 20px 35px -10px rgba(219, 39, 119, 0.5); 
            filter: brightness(1.1);
          }
          .ticket-btn-primary:active { transform: translateY(1px) scale(0.97); }

          .nav-pill-btn { 
            flex: 1; 
            min-width: 85px; 
            padding: 14px 10px; 
            border-radius: 20px; 
            background: rgba(255, 255, 255, 0.03); 
            border: 1px solid var(--glass-border); 
            color: var(--text-dim); 
            font-size: 12px; 
            font-weight: 800; 
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
            cursor: pointer;
            display: flex; 
            align-items: center; 
            justify-content: center;
          }
          .nav-pill-btn.active { 
            background: var(--rose-gradient); 
            color: white; 
            border-color: transparent; 
            box-shadow: 0 10px 20px -5px rgba(219, 39, 119, 0.4); 
            transform: scale(1.05) translateY(-2px); 
          }

          .glass-card-luxury { 
            background: var(--glass-card); 
            border: 1px solid var(--glass-border); 
            border-radius: 32px; 
            padding: 28px; 
            backdrop-filter: blur(35px); 
            box-shadow: var(--admin-shadow); 
            position: relative; 
            transition: all 0.3s ease;
          }
          .glass-card-luxury:hover { border-color: rgba(255,255,255,0.15); }
          
          .beauty-modal-card {
            background: var(--glass-card);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 36px;
            padding: 35px;
            width: 90%;
            max-width: 380px;
            backdrop-filter: blur(50px);
            box-shadow: 0 40px 100px -20px rgba(0,0,0,0.9);
            animation: modal-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            text-align: center;
          }
          @keyframes modal-pop { 
            from { transform: scale(0.8); opacity: 0; } 
            to { transform: scale(1); opacity: 1; } 
          }

          .live-status-pill {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            padding: 4px 10px;
            border-radius: 12px;
            margin-top: 6px;
          }
          .live-dot-pulse { 
            width: 10px; 
            height: 10px; 
            background: #10b981; 
            border-radius: 50%; 
            animation: pulse-live 2s infinite; 
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
          }
          @keyframes pulse-live { 
            0% { transform: scale(0.85); opacity: 0.6; } 
            50% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 15px rgba(16, 185, 129, 0.6); } 
            100% { transform: scale(0.85); opacity: 0.6; } 
          }
          
          .admin-toast-float {
            background: var(--rose-gradient);
            padding: 18px 32px;
            border-radius: 24px;
            box-shadow: 0 25px 50px -10px rgba(219, 39, 119, 0.5);
          }
        `}</style>
        
        <div className="admin-header-luxury">
           <div>
              <h2 className="admin-title-pro">⚙️ គ្របគ្រង MO-MO</h2>
              <div className="live-status-pill">
                 <div className="live-dot-pulse"></div>
                 <span style={{ fontSize: 9, fontWeight: 950, color: '#10b981', textTransform: 'uppercase', letterSpacing: 1.2 }}>Real-time Live</span>
              </div>
           </div>
           <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => refetchData(false)} className="icon-btn-admin" aria-label="Refresh Data" title="Refresh">🔄</button>
              <button onClick={() => setView('home')} className="back-btn-pill">← ចាកចេញ</button>
           </div>
        </div>

        <div className="admin-nav-luxury-grid">
          {[
            { id: 'overview', label: '📊 ទិន្នន័យ' },
            { id: 'orders', label: '🎫 កម្មង់' },
            { id: 'products', label: '🛍️ ទំនិញ' },
            { id: 'broadcast', label: '📢 ដំណឹង' },
            { id: 'settings', label: '⚙️ កំណត់' }
          ].map(tab => (
            <button key={tab.id} className={`nav-pill-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 15px' }}>
          {activeTab === 'overview' && (
            <div className="tab-pane-animate">
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 25 }}>
                  <div className="glass-card-luxury" style={{ padding: '20px', background: 'rgba(236,72,153,0.1)', borderColor: 'rgba(236,72,153,0.3)' }}>
                     <div style={{ fontSize: 10, fontWeight: 900, color: '#ec4899', textTransform: 'uppercase', marginBottom: 8 }}>💰 ចំណូលសរុប</div>
                     <div style={{ fontSize: 26, fontWeight: 950 }}>${summary.totalRevenue.toLocaleString()}</div>
                  </div>
                  <div className="glass-card-luxury" style={{ padding: '20px' }}>
                     <div style={{ fontSize: 10, fontWeight: 900, color: '#a855f7', textTransform: 'uppercase', marginBottom: 8 }}>🎫 កម្មង់កំពុងដើរ</div>
                     <div style={{ fontSize: 26, fontWeight: 950 }}>{summary.activeOrders}</div>
                  </div>
                  <div className="glass-card-luxury" style={{ padding: '20px' }}>
                     <div style={{ fontSize: 10, fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', marginBottom: 8 }}>👤 អតិថិជន</div>
                     <div style={{ fontSize: 26, fontWeight: 950 }}>{summary.totalCustomers}</div>
                  </div>
                  <div className="glass-card-luxury" style={{ padding: '20px' }}>
                     <div style={{ fontSize: 10, fontWeight: 900, color: '#10b981', textTransform: 'uppercase', marginBottom: 8 }}>✨ សុខភាពហាង</div>
                     <div style={{ fontSize: 26, fontWeight: 950 }}>{summary.businessHealth}%</div>
                  </div>
               </div>
               
               <div className="glass-card-luxury" style={{ marginBottom: 25 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 15 }}>🛍️ កម្ម៉ង់ថ្មីៗ</div>
                  {orders.slice(0, 3).map(o => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--glass-border)' }}>
                       <div>
                          <div style={{ fontSize: 13, fontWeight: 800 }}>{o.user_name}</div>
                          <div className="ticket-id-luxury" style={{ fontSize: 9, padding: '2px 6px', marginTop: 4 }}>{o.order_code || `#MO-${o.id}`}</div>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 14, fontWeight: 900 }}>${parseFloat(o.total).toFixed(2)}</div>
                          <div style={{ fontSize: 9, color: '#ec4899', fontWeight: 800 }}>{(statusTags[o.status] || {}).label}</div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="tab-pane-animate">
               <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
                  <input className="input-glass-admin" style={{ flex: 1 }} placeholder="ស្វែងរកលេខកម្ម៉ង់ ឬឈ្មោះ..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  <select className="input-glass-admin" style={{ width: 140 }} value={orderFilter} onChange={e => setOrderFilter(e.target.value)}>
                     <option value="all">ទាំងអស់</option>
                     <option value="pending">⌛ រង់ចាំបង់</option>
                     <option value="paid">✅ បង់រួច</option>
                     <option value="active">🚀 កំពុងដើរ</option>
                  </select>
               </div>
               {orders
                 .filter(o => {
                   const matchesSearch = (o.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (o.order_code || '').toLowerCase().includes(searchTerm.toLowerCase());
                   if (orderFilter === 'pending') return matchesSearch && o.status === 'pending';
                   if (orderFilter === 'paid') return matchesSearch && o.status === 'paid';
                   if (orderFilter === 'active') return matchesSearch && ['paid','processing','shipped','delivering'].includes(o.status);
                   // Default 'all' - still hide pending by default unless searching specific code
                   if (orderFilter === 'all' && !searchTerm) return o.status !== 'pending';
                   return matchesSearch;
                 })
                 .map(o => (
                 <div key={o.id} className="glass-card-luxury" style={{ marginBottom: 15, padding: 15 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                       <span className="ticket-id-luxury">{o.order_code || `#MO-${o.id}`}</span>
                       <span style={{ fontSize: 11, fontWeight: 900, background: 'var(--glass-border)', padding: '4px 10px', borderRadius: 8 }}>{(statusTags[o.status] || {}).icon} {(statusTags[o.status] || {}).label}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                       <div>
                          <div style={{ fontWeight: 800 }}>{o.user_name}</div>
                          <div style={{ fontSize: 11, opacity: 0.6 }}>📞 {o.phone}</div>
                       </div>
                       <div style={{ fontSize: 18, fontWeight: 950 }}>${parseFloat(o.total).toFixed(2)}</div>
                    </div>
                    <div className="button-group-pro">
                       {o.status === 'pending' && <button className="ticket-btn-primary" onClick={() => updateStatus(o.id, 'paid')}>💰 បញ្ជាក់បង់ប្រាក់</button>}
                       {o.status === 'paid' && <button className="ticket-btn-primary" style={{ background: '#f59e0b' }} onClick={() => updateStatus(o.id, 'processing')}>📦 រៀបចំអីវ៉ាន់</button>}
                       {o.status === 'processing' && <button className="ticket-btn-primary" style={{ background: '#a855f7' }} onClick={() => updateStatus(o.id, 'shipped')}>✨ អីវ៉ាន់ចេញ</button>}
                       {['paid','processing','shipped','delivering','delivered'].includes(o.status) && (
                         <button className="icon-btn-admin" style={{ flexShrink: 0 }} aria-label="Print Order" onClick={() => {
                            setPrintingOrder(o);
                            setTimeout(() => { window.print(); setPrintingOrder(null); }, 100);
                         }}>🖨️</button>
                       )}
                    </div>
                 </div>
               ))}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="tab-pane-animate">
               <button className="ticket-btn-primary" style={{ marginBottom: 20 }} onClick={() => setIsAddingProduct(true)}>➕ បន្ថែមទំនិញថ្មី</button>
                <div style={{ display: 'grid', gap: 12, marginBottom: 30 }}>
                  {products.map(p => (
                    <div key={p.id} className="glass-card-luxury" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                       <img src={p.image} style={{ width: 50, height: 50, borderRadius: 12, objectFit: 'cover' }} alt={p.name} crossOrigin="anonymous" />
                        <div style={{ flex: 1 }}>
                           <div style={{ fontWeight: 800, fontSize: 14 }}>{p.name}</div>
                           <div style={{ fontSize: 11, color: '#ec4899', fontWeight: 800, marginTop: 4 }}>
                              {p.category} • ${p.price} • {p.stock} {[...Array(Math.ceil(p.stock/20))].map((_, i) => <span key={i}>📦</span>)}
                           </div>
                        </div>
                        <button className="icon-btn-admin" aria-label="Edit product" onClick={() => { 
                           setEditingProduct(p); 
                           setEditFormData({ 
                              name: p.name, 
                              price: p.price, 
                              stock: p.stock,
                              category: p.category,
                              description: p.description || '',
                              image: p.image || '',
                              additional_images: typeof p.additional_images === 'string' ? JSON.parse(p.additional_images) : (p.additional_images || [])
                           }); 
                        }}>✏️</button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'broadcast' && (
            <div className="tab-pane-animate">
               <div className="glass-card-luxury">
                  <div style={{ textAlign: 'center', marginBottom: 25 }}>
                     <div style={{ fontSize: 40 }}>📢</div>
                     <h3 style={{ margin: '10px 0', fontSize: 18, fontWeight: 950 }}>ផ្សាយដំណឹង (Broadcast)</h3>
                  </div>
                  <div style={{ marginBottom: 15 }}>
                     <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>រូបភាពបដា</label>
                     <label className="upload-zone-luxury">
                        {broadcastImage ? (
                          <img src={broadcastImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" crossOrigin="anonymous" />
                        ) : (
                          <div className="upload-label-content">
                            <div style={{ fontSize: 24 }}>📸</div>
                            <div style={{ fontSize: 13, fontWeight: 800 }}>ចុចដាក់រូបភាព</div>
                            <div style={{ fontSize: 10, opacity: 0.5 }}>PNG, JPG (Max 5MB)</div>
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleBroadcastUpload(file);
                        }} />
                     </label>
                  </div>
                  <textarea className="input-glass-admin" rows="4" style={{ marginBottom: 20 }} value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="សរសេរសារដំណឹង..."></textarea>
                  <button className="ticket-btn-primary" onClick={handleBroadcast} disabled={isBroadcasting}>{isBroadcasting ? '⌛ កំពុងផ្ញើ...' : '🚀 ផ្ញើដំណឹងឥឡូវនេះ'}</button>
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="tab-pane-animate">
               <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="glass-card-luxury" style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '20px 28px' }}>
                    <div style={{ flex: 1 }}>
                       <div style={{ fontWeight: 950, fontSize: 16 }}>🏪 ស្ថានភាពហាង</div>
                       <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>កំណត់ថាហាងបើក ឬបិទបណ្តោះអាសន្ន</div>
                    </div>
                    <div style={{ width: 150 }}>
                       <select 
                         className="input-glass-admin" 
                         style={{ padding: '10px 14px', borderRadius: 14, fontSize: 13 }}
                         value={shopStatus} 
                         onChange={e => { 
                           const newVal = e.target.value;
                           showConfirm(
                             `តើអ្នកពិតជាចង់ ${newVal === 'open' ? 'បើក' : 'បិទ'} ហាងមែនទេ?`, 
                             () => {
                               setShopStatus(newVal); 
                               updateSettingValue('shop_status', newVal); 
                             },
                             '🏪'
                           );
                         }}
                       >
                          <option value="open">🟢 បើកលក់</option>
                          <option value="closed">🔴 បិទផ្អាក</option>
                       </select>
                    </div>
                  </div>

                  <div className="glass-card-luxury">
                     <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{ fontSize: 24 }}>🚚</div>
                        <div style={{ flex: 1 }}>
                           <div style={{ fontWeight: 950, fontSize: 16 }}>សេវាដឹកជញ្ជូន</div>
                           <div style={{ fontSize: 12, opacity: 0.6 }}>កំណត់តម្លៃដឹក និងលក្ខខណ្ឌដឹកហ្វ្រី</div>
                        </div>
                     </div>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                        <div>
                           <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>តម្លៃដឹកធម្មតា ($)</label>
                           <input className="input-glass-admin" placeholder="0.00" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} />
                        </div>
                        <div>
                           <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>ដឹកហ្វ្រីលើសពី ($)</label>
                           <input className="input-glass-admin" placeholder="50.00" value={deliveryThreshold} onChange={e => setDeliveryThreshold(e.target.value)} />
                        </div>
                     </div>
                     <button className="ticket-btn-primary" onClick={() => { updateSettingValue('delivery_fee', deliveryFee); updateSettingValue('delivery_threshold', deliveryThreshold); }}>
                       💾 រក្សាទុកការកំណត់
                     </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                    <div className="glass-card-luxury" style={{ padding: 20 }}>
                       <div style={{ fontWeight: 950, marginBottom: 15, fontSize: 14 }}>🖼️ បដាហាង</div>
                       <label className="upload-zone-luxury" style={{ height: 110 }}>
                          {promoBannerUrl ? (
                            <img src={promoBannerUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" crossOrigin="anonymous" />
                          ) : (
                            <div className="upload-label-content">
                               <div style={{ fontSize: 22 }}>🌄</div>
                               <div style={{ fontSize: 11, fontWeight: 900 }}>ប្តូរបដា</div>
                            </div>
                          )}
                          <input type="file" accept="image/*" onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleBannerUpload(file);
                          }} />
                       </label>
                    </div>
                    <div className="glass-card-luxury" style={{ padding: 20 }}>
                       <div style={{ fontWeight: 950, marginBottom: 15, fontSize: 14 }}>🏷️ ឡូហ្គោហាង</div>
                       <label className="upload-zone-luxury" style={{ height: 110 }}>
                          {shopLogoUrl ? (
                            <img src={shopLogoUrl} style={{ height: '100%', objectFit: 'contain' }} alt="" crossOrigin="anonymous" />
                          ) : (
                            <div className="upload-label-content">
                               <div style={{ fontSize: 22 }}>🏷️</div>
                               <div style={{ fontSize: 11, fontWeight: 900 }}>ប្តូរឡូហ្គោ</div>
                            </div>
                          )}
                          <input type="file" accept="image/*" onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file);
                          }} />
                       </label>
                    </div>
                  </div>
               </div>
            </div>
          )}

        </div>

        {showSuccessToast && (
          <div className="admin-toast-float">
             <span>✨</span>
             <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* ✅ Modals rendered OUTSIDE the animate-in container so position:fixed works correctly */}
      {editingProduct && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(14px)' }}>
          <div className="glass-card-luxury" style={{ width: '92%', maxWidth: 440, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h3 style={{ marginBottom: 20, flexShrink: 0 }}>✏️ កែប្រែទំនិញ</h3>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: 5, paddingBottom: 5 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>រូបភាពទំនិញ</label>
                <label className="upload-zone-luxury" style={{ height: 140, position: 'relative' }}>
                  {isUploading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 20 }}>
                      <div className="pd-pulse-loader" style={{ fontSize: 28, marginBottom: 8 }}>⌛</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>កំពុងផ្ទុក...</div>
                    </div>
                  )}
                  {editFormData.image ? (
                    <img src={editFormData.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" crossOrigin="anonymous" />
                  ) : (
                    <div className="upload-label-content"><div style={{ fontSize: 24 }}>📦</div><div style={{ fontSize: 13, fontWeight: 800 }}>ប្តូររូបភាព</div></div>
                  )}
                  <input type="file" accept="image/*" disabled={isUploading} onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) { 
                      const fd = new FormData(); 
                      fd.append('image', file); 
                      setIsUploading(true);
                      fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers, body: fd }).then(res => { 
                        if (res.success && res.data?.url) setEditFormData(prev => ({ ...prev, image: res.data.url })); 
                      }).finally(() => setIsUploading(false)); 
                    }
                  }} />
                </label>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>ឈ្មោះទំនិញ</label>
                <input className="input-glass-admin" placeholder="ឈ្មោះ" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>ប្រភេទ</label>
                <select className="input-glass-admin" value={categories.some(c => c.name === editFormData.category) ? editFormData.category : 'OTHER'} onChange={e => setEditFormData({...editFormData, category: e.target.value})}>
                  <option value="" disabled>រើសប្រភេទ...</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  <option value="OTHER">➕ បន្ថែមប្រភេទថ្មី (Add New)</option>
                </select>
                <input 
                  className="input-glass-admin" 
                  style={{ marginTop: 8, display: categories.some(c => c.name === editFormData.category) ? 'none' : 'block' }} 
                  placeholder="វាយបញ្ចូលឈ្មោះប្រភេទថ្មី..." 
                  value={editFormData.category === 'OTHER' ? '' : editFormData.category} 
                  onChange={e => setEditFormData({...editFormData, category: e.target.value})} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>តម្លៃ ($)</label>
                  <input className="input-glass-admin" type="number" placeholder="តម្លៃ ($)" value={editFormData.price} onChange={e => setEditFormData({...editFormData, price: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>ស្តុក</label>
                  <input className="input-glass-admin" type="number" placeholder="ស្តុក" value={editFormData.stock} onChange={e => setEditFormData({...editFormData, stock: e.target.value})} />
                </div>
              </div>
              
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>ការពណ៌នា</label>
                <textarea className="input-glass-admin" rows="3" value={editFormData.description} onChange={e => setEditFormData({ ...editFormData, description: e.target.value })} placeholder="ការពណ៌នាចំណុចពិសេស..."></textarea>
              </div>
              <div className="admin-gallery-editor" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 800, opacity: 0.6 }}>ជំនួយរូបភាព (Gallery)</label>
                <div className="gallery-grid-lux">
                  {(editFormData.additional_images || []).map((img, idx) => (
                    <div key={idx} className="gallery-thumb-item">
                      <img src={img} alt="" crossOrigin="anonymous" />
                      <button className="remove-thumb-btn" onClick={() => { const n = [...editFormData.additional_images]; n.splice(idx, 1); setEditFormData({ ...editFormData, additional_images: n }); }}>✕</button>
                    </div>
                  ))}
                  <label className="add-gallery-slot" style={{ position: 'relative' }}>
                    {isUploading && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, borderRadius: 16 }}>
                        <div className="pd-pulse-loader" style={{ fontSize: 18 }}>⌛</div>
                      </div>
                    )}
                    <span>+</span><label>ថែមរូប</label>
                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isUploading} onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) { 
                        const fd = new FormData(); 
                        fd.append('image', file); 
                        setIsUploading(true);
                        fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers, body: fd }).then(d => { 
                          if (d.success && d.data?.url) setEditFormData(prev => ({ ...prev, additional_images: [...(prev.additional_images || []), d.data.url] })); 
                        }).finally(() => setIsUploading(false)); 
                      }
                    }} />
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 15, flexShrink: 0 }}>
                <button className="nav-pill-btn btn-destructive" style={{ flex: 1 }} disabled={isSaving} onClick={() => setEditingProduct(null)}>បោះបង់</button>
                <button className="nav-pill-btn" style={{ flex: 1, background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' }} onClick={() => handlePreview(editFormData)}>👁️ មើលសិន</button>
                <button className="ticket-btn-primary" style={{ flex: 1.5 }} disabled={isSaving} onClick={submitEditProduct}>
                  {isSaving ? '⌛...' : 'រក្សាទុក'}
                </button>
            </div>
          </div>
        </div>
      )}

      {isAddingProduct && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(14px)' }}>
          <div className="glass-card-luxury" style={{ width: '92%', maxWidth: 440, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h3 style={{ marginBottom: 20, flexShrink: 0 }}>➕ បន្ថែមទំនិញថ្មី</h3>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: 5, paddingBottom: 5 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>រូបភាពទំនិញ</label>
                <label className="upload-zone-luxury" style={{ height: 140, position: 'relative' }}>
                  {isUploading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 20 }}>
                      <div className="pd-pulse-loader" style={{ fontSize: 28, marginBottom: 8 }}>⌛</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>កំពុងផ្ទុក...</div>
                    </div>
                  )}
                  {newProductData.image ? (
                    <img src={newProductData.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" crossOrigin="anonymous" />
                  ) : (
                    <div className="upload-label-content"><div style={{ fontSize: 24 }}>✨</div><div style={{ fontSize: 13, fontWeight: 800 }}>ដាក់រូបភាព</div></div>
                  )}
                  <input type="file" accept="image/*" disabled={isUploading} onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) { 
                      const fd = new FormData(); 
                      fd.append('image', file); 
                      setIsUploading(true);
                      fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers, body: fd }).then(res => { 
                        if (res.success && res.data?.url) setNewProductData(prev => ({ ...prev, image: res.data.url })); 
                      }).finally(() => setIsUploading(false)); 
                    }
                  }} />
                </label>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>ឈ្មោះទំនិញ</label>
                <input className="input-glass-admin" placeholder="ឈ្មោះទំនិញ" value={newProductData.name} onChange={e => setNewProductData({...newProductData, name: e.target.value})} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>ប្រភេទ</label>
                <select className="input-glass-admin" value={categories.some(c => c.name === newProductData.category) ? newProductData.category : 'OTHER'} onChange={e => setNewProductData({...newProductData, category: e.target.value})}>
                  <option value="" disabled>រើសប្រភេទ...</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  <option value="OTHER">➕ បន្ថែមប្រភេទថ្មី (Add New)</option>
                </select>
                <input 
                  className="input-glass-admin" 
                  style={{ marginTop: 8, display: categories.some(c => c.name === newProductData.category) ? 'none' : 'block' }} 
                  placeholder="វាយបញ្ចូលឈ្មោះប្រភេទថ្មី..." 
                  value={newProductData.category === 'OTHER' ? '' : newProductData.category} 
                  onChange={e => setNewProductData({...newProductData, category: e.target.value})} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>តម្លៃ ($)</label>
                  <input className="input-glass-admin" type="number" placeholder="តម្លៃ ($)" value={newProductData.price} onChange={e => setNewProductData({...newProductData, price: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>ស្តុក</label>
                  <input className="input-glass-admin" type="number" placeholder="ស្តុក" value={newProductData.stock} onChange={e => setNewProductData({...newProductData, stock: e.target.value})} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>ចំណុចពិសេស (Description)</label>
                <textarea className="input-glass-admin" rows="3" value={newProductData.description} onChange={e => setNewProductData({ ...newProductData, description: e.target.value })} placeholder="ចំណុចពិសេស (Description)..."></textarea>
              </div>
              <div className="admin-gallery-editor" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 800, opacity: 0.6 }}>ជំនួយរូបភាព (Gallery)</label>
                <div className="gallery-grid-lux">
                  {(newProductData.additional_images || []).map((img, idx) => (
                    <div key={idx} className="gallery-thumb-item">
                      <img src={img} alt="" crossOrigin="anonymous" />
                      <button className="remove-thumb-btn" onClick={() => { const n = [...newProductData.additional_images]; n.splice(idx, 1); setNewProductData({ ...newProductData, additional_images: n }); }}>✕</button>
                    </div>
                  ))}
                  <label className="add-gallery-slot" style={{ position: 'relative' }}>
                    {isUploading && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, borderRadius: 16 }}>
                        <div className="pd-pulse-loader" style={{ fontSize: 18 }}>⌛</div>
                      </div>
                    )}
                    <span>+</span><label>ថែមរូប</label>
                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isUploading} onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) { 
                        const fd = new FormData(); 
                        fd.append('image', file); 
                        setIsUploading(true);
                        fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers, body: fd }).then(d => { 
                          if (d.success && d.data?.url) setNewProductData(prev => ({ ...prev, additional_images: [...(prev.additional_images || []), d.data.url] })); 
                        }).finally(() => setIsUploading(false)); 
                      }
                    }} />
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 15, flexShrink: 0 }}>
              <button className="nav-pill-btn btn-destructive" style={{ flex: 1 }} disabled={isSaving} onClick={() => setIsAddingProduct(false)}>បោះបង់</button>
              <button className="nav-pill-btn" style={{ flex: 1, background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' }} onClick={() => handlePreview(newProductData)}>👁️ មើលសិន</button>
              <button className="ticket-btn-primary" style={{ flex: 1.5 }} disabled={isSaving} onClick={submitAddProduct}>
                {isSaving ? '⌛...' : 'រក្សាទុក'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPreviewing && previewData && (
        <ProductDetail 
          product={previewData} 
          onClose={() => setIsPreviewing(false)} 
          onAdd={() => showAlert('នេះគ្រាន់តែជារូបភាព Preview!')}
          lang={tg?.language_code === 'kh' ? 'kh' : 'en'}
          t={(key) => key}
        />
      )}

      {confirmDialog && (
        <BeautyModal 
          text={confirmDialog.text}
          icon={confirmDialog.icon}
          isAlert={confirmDialog.isAlert}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </>
  );
};

const BeautyModal = ({ text, icon, isAlert, onConfirm, onCancel }) => (
  <div className="modal-overlay">
    <div className="beauty-modal-card">
      <div style={{ fontSize: 50, marginBottom: 20 }}>{icon || '✨'}</div>
      <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 30, lineHeight: 1.6, color: 'var(--text-luxury)' }}>{text}</div>
      <div style={{ display: 'flex', gap: 12 }}>
        {!isAlert && (
          <button className="nav-pill-btn" style={{ flex: 1, minHeight: 50 }} onClick={onCancel}>បោះបង់</button>
        )}
        <button className="ticket-btn-primary" style={{ flex: 1.5, minHeight: 50 }} onClick={onConfirm}>
          {isAlert ? 'យល់ព្រម' : 'បន្ត'}
        </button>
      </div>
    </div>
  </div>
);

const PrintableOrder = ({ order }) => {
  if (!order) return null;
  const items = JSON.parse(order.items || '[]');
  return (
    <div className="printable-order">
      <div className="print-header">
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 950 }}>MO-MO Boutique</h2>
        <p style={{ margin: '5px 0', fontSize: 14 }}>អីវ៉ាន់បោះដុំ និងរាយ</p>
      </div>
      <div className="print-divider"></div>
      <div className="print-section">
        <div className="print-row"><span>លេខវិក្កយបត្រ:</span> <strong>{order.order_code || `#MO-${order.id}`}</strong></div>
        <div className="print-row"><span>អតិថិជន:</span> <strong>{order.user_name}</strong></div>
        <div className="print-row"><span>លេខទូរស័ព្ទ:</span> <strong>{order.phone}</strong></div>
      </div>
      <div className="print-divider"></div>
      <table className="print-table">
        <thead><tr><th align="left">ឈ្មោះទំនិញ</th><th align="center">ចំនួន</th><th align="right">តម្លៃ</th></tr></thead>
        <tbody>{items.map((item, i) => (<tr key={i}><td style={{ fontSize: '12px', fontWeight: 'bold' }}>{item.name}</td><td align="center">x{item.quantity}</td><td align="right">${(item.price * item.quantity).toFixed(2)}</td></tr>))}</tbody>
      </table>
      <div className="print-divider"></div>
      <div className="print-total"><span>សរុបរួម:</span> <span style={{ fontSize: 20, fontWeight: 950 }}>${parseFloat(order.total).toFixed(2)}</span></div>
    </div>
  );
};

export default AdminDashboard;
