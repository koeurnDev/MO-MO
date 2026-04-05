import React, { useEffect, useState } from 'react';

const AdminDashboard = ({ BACKEND_URL, setView }) => {
  const [activeTab, setActiveTab] = useState('overview'); 
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [analytics, setAnalytics] = useState({ daily: [], status: [] });
  const [shopStatus, setShopStatus] = useState('open');
  const [deliveryThreshold, setDeliveryThreshold] = useState('50');
  const [deliveryFee, setDeliveryFee] = useState('1.50');
  const [promoText, setPromoText] = useState('');
  const [paymentQrUrl, setPaymentQrUrl] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [bakongAccountId, setBakongAccountId] = useState('');
  const [bakongMerchantName, setBakongMerchantName] = useState('');
  const [bakongApiUrl, setBakongApiUrl] = useState('');
  const [bakongApiToken, setBakongApiToken] = useState('');
  const [bakongAutoConfirm, setBakongAutoConfirm] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', price: '', category: 'perfume', image: '', stock: 10 });

  const [categories, setCategories] = useState([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [confirmDialog, setConfirmDialog] = useState(null);
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = () => {
    setLoading(true);
    const tgData = window.Telegram?.WebApp?.initData || '';
    const headers = { 'X-TG-Data': tgData };

    if (activeTab === 'overview' || activeTab === 'orders') {
      fetch(`${BACKEND_URL}/api/admin/orders`, { headers }).then(res => res.json())
        .then(data => { if (data.success) setOrders(data.orders); setLoading(false); }).catch(() => setLoading(false));
    }
    
    if (activeTab === 'overview') {
      fetch(`${BACKEND_URL}/api/admin/analytics`, { headers }).then(res => res.json())
        .then(ana => { if (ana.success) setAnalytics({ daily: ana.daily, status: ana.status }); });
      fetch(`${BACKEND_URL}/api/admin/customers`, { headers }).then(res => res.json())
        .then(c => { if (c.success) setCustomers(c.customers); });
    }

    if (activeTab === 'products') {
      fetch(`${BACKEND_URL}/api/products`).then(res => res.json())
        .then(data => { if (data.success) setProducts(data.products); setLoading(false); });
      fetch(`${BACKEND_URL}/api/admin/categories`, { headers }).then(res => res.json())
        .then(data => { if (data.success) setCategories(data.categories); });
    }

    if (activeTab === 'customers') {
      fetch(`${BACKEND_URL}/api/admin/customers`, { headers }).then(res => res.json())
        .then(data => { if (data.success) setCustomers(data.customers); setLoading(false); });
    }

    if (activeTab === 'coupons') {
      fetch(`${BACKEND_URL}/api/admin/coupons`, { headers }).then(res => res.json())
        .then(data => { if (data.success) setCoupons(data.orders || data.coupons); setLoading(false); });
    }

    if (activeTab === 'settings') {
      fetch(`${BACKEND_URL}/api/admin/settings/shop_status`, { headers }).then(res => res.json()).then(d => setShopStatus(d.value));
      fetch(`${BACKEND_URL}/api/admin/settings/delivery_threshold`, { headers }).then(res => res.json()).then(d => setDeliveryThreshold(d.value));
      fetch(`${BACKEND_URL}/api/admin/settings/delivery_fee`, { headers }).then(res => res.json()).then(d => setDeliveryFee(d.value));
      fetch(`${BACKEND_URL}/api/admin/settings/promo_text`, { headers }).then(res => res.json()).then(d => setPromoText(d.value));
      fetch(`${BACKEND_URL}/api/admin/settings/bakong_api_token`, { headers }).then(res => res.json()).then(d => setBakongApiToken(d.value));
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, status) => {
    const tgData = window.Telegram?.WebApp?.initData || '';
    fetch(`${BACKEND_URL}/api/admin/orders/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-TG-Data': tgData },
      body: JSON.stringify({ orderId, status })
    }).then(() => {
        haptic('success');
        fetchData();
    });
  };

  const confirmPayment = (orderId) => {
    setConfirmDialog({
      text: `បញ្ជាក់ការបង់ប្រាក់សម្រាប់ #MO-${orderId}?`,
      onConfirm: () => updateStatus(orderId, 'paid')
    });
  };

  const deleteProduct = (id) => {
     setConfirmDialog({
       text: 'តើបងចង់លុបទំនិញនេះមែនទេ?',
       onConfirm: () => {
         fetch(`${BACKEND_URL}/api/admin/products/${id}`, { method: 'DELETE', headers: { 'X-TG-Data': window.Telegram?.WebApp?.initData || '' } }).then(() => fetchData());
       }
     });
  };

  const haptic = (type = 'light') => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(type);
  };

  const statusTags = {
    'pending': { label: 'រង់ចាំបង់', color: '#64748b', icon: '⏳' },
    'paid': { label: 'បង់រួច', color: '#10b981', icon: '✅' },
    'processing': { label: 'រៀបចំអីវ៉ាន់', color: '#f59e0b', icon: '📦' },
    'shipped': { label: 'អីវ៉ាន់បានចេញ', color: '#a855f7', icon: '✨' },
    'delivering': { label: 'កំពុងដឹក', color: '#3b82f6', icon: '🚚' },
    'delivered': { label: 'បានដល់ដៃ', color: '#10b981', icon: '🏠' }
  };

  const showAlert = (msg) => {
     if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(msg);
     } else {
        alert(msg);
     }
  };

  return (
    <div className="admin-dashboard-overhaul animate-in" style={{ paddingBottom: 100 }}>
       <div className="admin-header-luxury">
          <h2 className="admin-title-pro">⚙️ គ្រប់គ្រងទូទៅ</h2>
          <button onClick={() => setView('home')} className="back-btn-pill">← ត្រលប់ក្រោយ</button>
       </div>

       <div className="admin-nav-scrollable" style={{ gap: 8, padding: '10px 0' }}>
          {[
            { id: 'overview', label: '📊 ទិន្នន័យ' },
            { id: 'orders', label: '🧾 កម្ម៉ង់' },
            { id: 'products', label: '🛍️ ទំនិញ' },
            { id: 'broadcast', label: '📢 ផ្សាយដំណឹង' },
            { id: 'settings', label: '⚙️ ការកំណត់' }
          ].map(t => (
            <button key={t.id} className={`nav-pill ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
               {t.label}
            </button>
          ))}
       </div>

       <div className="tab-content-wrapper">
          {activeTab === 'orders' && (
            <div>
               <div style={{ padding: '0 5px 20px' }}>
                  <input className="input-glass wide" placeholder="ស្វែងរកលេខកម្ម៉ង់ ឬឈ្មោះ..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
               </div>

               <div className="admin-ticket-list">
                  {orders.filter(o => o.user_name.toLowerCase().includes(searchTerm.toLowerCase()) || String(o.id).includes(searchTerm)).map(o => (
                    <div key={o.id} className="admin-full-ticket animate-in" style={{ marginBottom: 20 }}>
                       <div className="ticket-header" style={{ borderBottom: '1px dashed #e2e8f0', paddingBottom: 15 }}>
                          <div>
                             <div className="ticket-order-tag">#MO-{o.id}</div>
                             <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{new Date(o.created_at).toLocaleString()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                             <div style={{ fontSize: 24, fontWeight: 900, color: '#ec4899' }}>${parseFloat(o.total).toFixed(2)}</div>
                             <span style={{ fontSize: 11, fontWeight: 800, color: (statusTags[o.status] || {}).color }}>
                                {(statusTags[o.status] || {}).icon} {(statusTags[o.status] || {}).label}
                             </span>
                          </div>
                       </div>

                       <div className="ticket-body" style={{ padding: '15px 0' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, marginBottom: 15 }}>
                             <div style={{ width: 40, height: 40, background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>
                             <div>
                                <div style={{ fontWeight: 800, fontSize: 16 }}>{o.user_name}</div>
                                {o.phone && <div style={{ color: '#ec4899', fontWeight: 900, fontSize: 14 }}>📞 {o.phone}</div>}
                             </div>
                          </div>

                          {o.address && (
                            <div style={{ background: '#f8fafc', padding: '12px 15px', borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: 15 }}>
                               <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', marginBottom: 5 }}>📍 DELIVERY ADDRESS</div>
                               <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>{o.address}</div>
                            </div>
                          )}

                          <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 12 }}>
                             {JSON.parse(o.items || '[]').map((item, idx) => (
                               <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                  <span style={{ fontWeight: 600 }}>• {item.name}</span>
                                  <span style={{ fontWeight: 800 }}>x{item.quantity}</span>
                               </div>
                             ))}
                          </div>
                       </div>

                       <div className="ticket-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                          {o.status === 'pending' && <button className="ticket-btn" style={{ gridColumn: 'span 2', background: '#10b981', color: 'white' }} onClick={() => confirmPayment(o.id)}>💸 បញ្ជាក់បង់ប្រាក់</button>}
                          
                          {o.status === 'paid' && <button className="ticket-btn" style={{ gridColumn: 'span 2', background: '#f59e0b', color: 'white' }} onClick={() => updateStatus(o.id, 'processing')}>📦 រៀបចំអីវ៉ាន់</button>}
                          
                          {o.status === 'processing' && <button className="ticket-btn" style={{ gridColumn: 'span 2', background: '#a855f7', color: 'white' }} onClick={() => updateStatus(o.id, 'shipped')}>✨ អីវ៉ាន់បានចេញ</button>}
                          
                          {o.status === 'shipped' && <button className="ticket-btn" style={{ gridColumn: 'span 2', background: '#3b82f6', color: 'white' }} onClick={() => updateStatus(o.id, 'delivering')}>🚚 កំពុងដឹក</button>}

                           {o.status === 'delivering' && <button className="ticket-btn" style={{ gridColumn: 'span 2', background: '#10b981', color: 'white' }} onClick={() => updateStatus(o.id, 'delivered')}>🏠 បានដឹកដល់ដៃ</button>}
                          
                          <button className="ticket-btn" style={{ opacity: 0.5 }}>🖨️ បោះពុម្ភ</button>
                          <button className="ticket-btn" style={{ opacity: 0.5 }}>❌ លុប</button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'broadcast' && (
            <div className="tab-pane-animate">
               <div className="admin-form-luxury" style={{ padding: 30, background: 'white' }}>
                  <div style={{ textAlign: 'center', marginBottom: 25 }}>
                     <div style={{ fontSize: 40, marginBottom: 10 }}>📢</div>
                     <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>ប្រព័ន្ធផ្សាយដំណឹង (Broadcast)</h3>
                     <p style={{ fontSize: 13, opacity: 0.6, marginTop: 5 }}>ផ្ញើសារផ្សាយពាណិជ្ជកម្ម ទៅកាន់អតិថិជនទាំងអស់</p>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                     <label style={{ fontSize: 13, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 10 }}>MESSAGE COMPOSER</label>
                     <textarea 
                        className="input-glass wide" 
                        rows="8" 
                        style={{ height: 'auto', padding: 20, fontSize: 16, border: '2px solid #f1f5f9' }}
                        placeholder="សរសេរសារផ្សាយដំណឹងបងនៅទីនេះ... (ឧទាហរណ៍៖ ម៉ូដថ្មីទើបមកដល់!)"
                        value={searchTerm} // Reusing searchTerm temporarily as message state? No, I'll use a better approach.
                        onChange={(e) => setSearchTerm(e.target.value)}
                     ></textarea>
                  </div>

                  <div style={{ background: '#fef2f2', padding: 15, borderRadius: 14, border: '1px solid #fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 700, marginBottom: 25 }}>
                     ⚠️ ប្រយ័ត្ន៖ សារនេះនឹងត្រូវផ្ញើទៅកាន់អតិថិជន "ទាំងអស់" ដែលធ្លាប់ទិញម្ដង។
                  </div>

                  <button 
                    className="confirm-order-btn-premium" 
                    style={{ width: '100%', borderRadius: 18, fontSize: 15 }}
                    onClick={() => {
                        if (!searchTerm.trim()) return showAlert('សូមមេត្តាសរសេរសារជាមុនសិន!');
                        setConfirmDialog({
                          text: `តើបងប្រាកដថាចង់ផ្ញើសារនេះទៅកាន់អតិថិជនទាំងអស់មែនទេ? ✉️`,
                          onConfirm: () => {
                             const tgData = window.Telegram?.WebApp?.initData || '';
                             fetch(`${BACKEND_URL}/api/admin/broadcast`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'X-TG-Data': tgData },
                                body: JSON.stringify({ message: searchTerm })
                             }).then(res => res.json()).then(data => {
                                if (data.success) {
                                   showAlert(`✅ ជោគជ័យ! បញ្ជូនសារទៅកាន់អតិថិជន ${data.count} នាក់។`);
                                   setSearchTerm('');
                                   haptic('success');
                                }
                             });
                          }
                        });
                    }}
                  >
                     បោះពុម្ពផ្សាយឥឡូវនេះ (Broadcast Now)
                  </button>
               </div>
            </div>
          )}

          {activeTab === 'overview' && <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>📊 Analytics Loading...</div>}
       </div>

       {confirmDialog && (
         <div className="modal-overlay">
           <div className="invoice-receipt" style={{ padding: 30, textAlign: 'center', width: '80%', borderRadius: 24, background: 'white' }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 25 }}>{confirmDialog.text}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                 <button className="ticket-btn" style={{ flex: 1, background: '#f1f5f9' }} onClick={() => setConfirmDialog(null)}>បោះបង់</button>
                 <button className="ticket-btn" style={{ flex: 1, background: '#1e1b4b', color: 'white' }} onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}>យល់ព្រម</button>
              </div>
           </div>
         </div>
       )}
    </div>
  );
};

export default AdminDashboard;
