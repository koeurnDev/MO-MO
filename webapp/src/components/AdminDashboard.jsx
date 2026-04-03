import React, { useEffect, useState } from 'react';
import InvoiceModal from './InvoiceModal';

const AdminDashboard = ({ BACKEND_URL }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'orders', 'products'
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', price: '', category: 'perfume', image: '', stock: 10 });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = () => {
    setLoading(true);
    // Fetch both for overview, or specific for tabs
    const endpoints = ['/api/admin/orders', '/api/products'];
    
    Promise.all(endpoints.map(e => fetch(`${BACKEND_URL}${e}`).then(res => res.json())))
      .then(([ordersData, productsData]) => {
        if (ordersData.success) setOrders(ordersData.orders);
        if (productsData.success) setProducts(productsData.products);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    fetch(`${BACKEND_URL}/api/admin/upload`, {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setProductForm({ ...productForm, image: data.url });
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
      setUploading(false);
    })
    .catch(() => setUploading(false));
  };

  const toggleStatus = (orderId, currentStatus) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    fetch(`${BACKEND_URL}/api/admin/orders/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status: newStatus })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      });
  };

  const handleProductSubmit = (e) => {
    e.preventDefault();
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct
      ? `${BACKEND_URL}/api/admin/products/${editingProduct.id}`
      : `${BACKEND_URL}/api/admin/products`;

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setShowProductForm(false);
          setEditingProduct(null);
          setProductForm({ name: '', price: '', category: 'perfume', image: '', stock: 10 });
          fetchData();
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      });
  };

  const handleDeleteProduct = (id) => {
    window.Telegram.WebApp.showConfirm('តើអ្នកប្រាកដជាចង់លុបទំនិញនេះមែនទេ?', (ok) => {
      if (ok) {
        fetch(`${BACKEND_URL}/api/admin/products/${id}`, { method: 'DELETE' })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              fetchData();
              window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
          });
      }
    });
  };

  const openEdit = (p) => {
    setEditingProduct(p);
    setProductForm({ name: p.name, price: p.price, category: p.category, image: p.image, stock: p.stock !== undefined ? p.stock : 10 });
    setShowProductForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && activeTab === 'overview') return <div className="loading-screen"><div className="loader"></div></div>;

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="admin-dashboard">
      {/* 1. Navigation Pill */}
      <div className="admin-nav-clean">
        <button className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          ទិដ្ឋភាពទូទៅ
        </button>
        <button className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          ការកុម្ម៉ង់
        </button>
        <button className={`admin-nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2-2v16"></path></svg>
          ទំនិញ
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="animate-in">
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="stat-icon-box" style={{ background: '#f0fdf4', color: '#16a34a' }}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <div className="stat-val">${totalRevenue.toFixed(2)}</div>
              <div className="stat-tit">ចំណូលសរុប</div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-icon-box" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path></svg>
              </div>
              <div className="stat-val">{orders.length}</div>
              <div className="stat-tit">ការកុម្ម៉ង់សរុប</div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-icon-box" style={{ background: '#fff7ed', color: '#ea580c' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div className="stat-val">{pendingOrders}</div>
              <div className="stat-tit">កំពុងរង់ចាំ</div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-icon-box" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
              </div>
              <div className="stat-val">{products.length}</div>
              <div className="stat-tit">ទំនិញសរុប</div>
            </div>
          </div>
          
          <h3 className="admin-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            សកម្មភាពថ្មីៗ
          </h3>
          <div className="recent-orders-mini">
            {orders.slice(0, 3).map(o => (
              <div key={o.id} className="admin-order-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{o.user_name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>#{o.id} • {new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className={`badge-clean ${o.status}`}>${o.total.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="animate-in">
          <div className="search-admin-row">
            <div style={{ position: 'relative', flex: 1 }}>
              <div className="search-icon-admin">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <input 
                type="text" 
                className="search-input-admin" 
                placeholder="ស្វែងរកការកុម្ម៉ង់..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="order-list-admin">
            {orders.filter(o => o.user_name.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.toString().includes(searchTerm)).map(order => (
              <div key={order.id} className="admin-order-card">
                <div className="order-top-row">
                  <div className="order-meta-info">
                    <span className="order-id-pill">#ORDER-{order.id}</span>
                    <span className="order-cust-name">{order.user_name}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(order.created_at).toLocaleString()}</span>
                  </div>
                  <span className={`badge-clean ${order.status}`}>{order.status}</span>
                </div>

                <div className="order-items-minimal">
                  {JSON.parse(order.items).map((item, idx) => (
                    <div key={idx} className="mini-item-row">
                      <span>{item.name} <span style={{ color: '#94a3b8' }}>x{item.quantity}</span></span>
                      <span style={{ fontWeight: 600 }}>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="order-actions-row">
                  <div className="order-price-admin">${order.total.toFixed(2)}</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="p-action-btn p-edit" style={{ width: 44 }} onClick={() => setSelectedOrder(order)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    </button>
                    <button 
                      className="submit-btn-clean" 
                      style={{ height: 36, width: 80, fontSize: 12, boxShadow: 'none' }}
                      onClick={() => toggleStatus(order.id, order.status)}
                    >
                      {order.status === 'pending' ? 'បញ្ចប់' : 'មិនទាន់'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <InvoiceModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        </div>
      )}

      {activeTab === 'products' && (
        <div className="animate-in">
          <button
            className="submit-btn-clean"
            style={{ marginBottom: 20 }}
            onClick={() => { setShowProductForm(!showProductForm); setEditingProduct(null); setProductForm({ name: '', price: '', category: 'perfume', image: '', stock: 10 }); }}
          >
            {showProductForm ? 'បិទផ្ទាំងកែសម្រួល' : 'បន្ថែមទំនិញថ្មី'}
          </button>

          {showProductForm && (
            <div className="admin-form-clean">
              <h3 style={{ margin: '0 0 20px 0', fontSize: 18 }}>{editingProduct ? 'កែសម្រួលទំនិញ' : 'បន្ថែមទំនិញថ្មី'}</h3>
              
              <div className="input-group-clean">
                <span className="label-khmer-clean">ឈ្មោះទំនិញ</span>
                <input className="input-clean" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} placeholder="ឧ. ទឹកអប់ ក្លិនផ្កាឈូក" />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div className="input-group-clean" style={{ flex: 1 }}>
                  <span className="label-khmer-clean">តម្លៃ ($)</span>
                  <input type="number" className="input-clean" value={productForm.price} onChange={(e) => setProductForm({...productForm, price: e.target.value})} placeholder="15.00" />
                </div>
                <div className="input-group-clean" style={{ flex: 1 }}>
                  <span className="label-khmer-clean">ចំនួនស្តុក</span>
                  <input type="number" className="input-clean" value={productForm.stock} onChange={(e) => setProductForm({...productForm, stock: e.target.value})} placeholder="10" />
                </div>
              </div>
              
              <div className="input-group-clean">
                <span className="label-khmer-clean">ប្រភេទ</span>
                <select className="input-clean" value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})}>
                    <option value="perfume">ទឹកអប់</option>
                    <option value="powder">ម្សៅ</option>
                    <option value="clothing">សម្លៀកបំពាក់</option>
                    <option value="promo">ប្រូម៉ូសិន</option>
                  </select>
                </div>

              <div className="input-group-clean">
                <span className="label-khmer-clean">រូបភាពទំនិញ</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input className="input-clean" style={{ flex: 1 }} value={productForm.image} onChange={(e) => setProductForm({...productForm, image: e.target.value})} placeholder="https://..." />
                  <button className="p-action-btn p-edit" style={{ width: 48, height: 48 }} onClick={() => document.getElementById('img-up').click()} disabled={uploading}>
                    {uploading ? '...' : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>}
                  </button>
                  <input id="img-up" type="file" style={{ display: 'none' }} accept="image/*" onChange={handleFileUpload} />
                </div>
              </div>

              {productForm.image && (
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 16, marginBottom: 16, textAlign: 'center' }}>
                  <img src={productForm.image} alt="preview" style={{ width: 100, height: 100, borderRadius: 12, objectFit: 'cover', border: '2px solid var(--admin-accent)' }} />
                </div>
              )}

              <button className="submit-btn-clean" onClick={handleProductSubmit}>រក្សាទុកទិន្នន័យ</button>
            </div>
          )}

          <div className="admin-products-grid">
            {products.map(p => (
              <div key={p.id} className="admin-product-item">
                <div className="product-img-box">
                  <img src={p.image} alt={p.name} />
                </div>
                <div className="product-details-admin">
                  <div className="p-name-admin">{p.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <div className="p-price-admin">${parseFloat(p.price).toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: p.stock > 0 ? '#10b981' : '#ef4444', fontWeight: 600, background: p.stock > 0 ? '#ecfdf5' : '#fef2f2', padding: '2px 8px', borderRadius: 10 }}>ស្តុកៈ {p.stock || 0}</div>
                  </div>
                </div>
                <div className="p-actions-row">
                  <button className="p-action-btn p-edit" onClick={() => openEdit(p)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button className="p-action-btn p-delete" onClick={() => handleDeleteProduct(p.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
