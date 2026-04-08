import React, { useEffect, useState } from 'react';

const PurchaseHistory = ({ setView, BACKEND_URL }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const orderStatuses = {
    'pending': { label: 'រង់ចាំបង់ប្រាក់', color: '#94a3b8', icon: '⏳', step: 0 },
    'paid': { label: 'បង់រួច', color: '#10b981', icon: '💰', step: 1 },
    'processing': { label: 'រៀបចំ', color: '#f59e0b', icon: '📦', step: 2 },
    'shipped': { label: 'ចេញហាង', color: '#a855f7', icon: '✨', step: 3 },
    'delivering': { label: 'កំពុងដឹក', color: '#3b82f6', icon: '🚚', step: 4 },
    'delivered': { label: 'មកដល់', color: '#10b981', icon: '🏠', step: 4 }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = () => {
    const tgData = window.Telegram.WebApp.initData;
    fetch(`${BACKEND_URL}/api/user/orders`, {
      headers: { 'X-TG-Data': tgData }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setOrders(data.orders);
      }
      setLoading(false);
    });
  };

  if (loading) return <div className="loading-screen"><div className="loader"></div></div>;

  return (
    <div className="history-page animate-in" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 25 }}>
         <button onClick={() => setView('home')} className="back-btn-pill">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
         </button>
         <h1 className="hero-welcome" style={{ margin: 0 }}>ប្រវត្តិការទិញ 📜</h1>
      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 20px', background: 'var(--bg-surface)', borderRadius: 28, boxShadow: 'var(--shadow-soft)', border: '1px solid var(--border-subtle)' }}>
           <div style={{ fontSize: 60, marginBottom: 20 }}>🛍️</div>
           <h3 style={{ marginBottom: 10, color: 'var(--text-bold)' }}>មិនទាន់មានការទិញទេ</h3>
           <p style={{ opacity: 0.6, fontSize: 13, marginBottom: 25, color: 'var(--text-main)' }}>រាល់ការកម្ម៉ង់របស់អ្នកនឹងបង្ហាញនៅទីនេះ។</p>
           <button onClick={() => setView('home')} className="shop-now-btn" style={{ width: '100%' }}>ទៅមើលទំនិញថ្មីៗ</button>
        </div>
      ) : (
        <div className="history-list">
          {orders.map(order => (
            <div key={order.id} className="history-card premium-card animate-in" style={{ marginBottom: 15, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
               <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, marginBottom: 4, color: 'var(--text-muted)' }}>
                        ORDER #{order.order_code || order.id}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-bold)' }}>
                        {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
               </div>
               {/* 🚀 Modern Step-based Tracker */}
               <div style={{ position: 'relative', margin: '30px 0', padding: '0 5px' }}>
                  <div style={{ position: 'absolute', top: '18px', left: 0, width: '100%', height: '4px', background: 'var(--bg-soft)', borderRadius: 10 }}></div>
                  <div style={{ 
                     position: 'absolute', top: '18px', left: 0, 
                     width: `${Math.max(0, ((orderStatuses[order.status]?.step || 0) - 1) * 25)}%`, 
                     height: '4px', background: orderStatuses[order.status]?.color || '#cbd5e1', borderRadius: 10, 
                     transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                  }}></div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                     {[
                       { step: 1, icon: '💰', label: 'Paid' },
                       { step: 2, icon: '📦', label: 'Packing' },
                       { step: 3, icon: '✨', label: 'Shipped' },
                       { step: 4, icon: '🚚', label: 'Moving' },
                       { step: 5, icon: '🏠', label: 'Arrived' }
                     ].map((s, i) => {
                        const stepNum = orderStatuses[order.status]?.step || 0;
                        const isActive = s.step <= stepNum;
                        const isCurrent = s.step === stepNum;
                        const sColor = orderStatuses[order.status]?.color || '#cbd5e1';
                        return (
                           <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                              <div style={{ 
                                 width: 32, height: 32, borderRadius: 12, 
                                 background: isActive ? sColor : 'var(--bg-surface)', 
                                 border: isActive ? `none` : '2px solid var(--border-subtle)',
                                 display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                                 boxShadow: isCurrent ? `0 0 15px ${sColor}44` : 'none',
                                 transform: isCurrent ? 'scale(1.1)' : 'none',
                                 transition: 'all 0.4s ease',
                                 position: 'relative'
                              }}>
                                 {isActive ? (isCurrent ? s.icon : '✓') : s.icon}
                                 {isCurrent && <div className="pulse-tracker" style={{ position: 'absolute', inset: -3, borderRadius: 15, border: `2px solid ${sColor}`, opacity: 0.5 }}></div>}
                              </div>
                              <div style={{ 
                                 fontSize: 7, fontWeight: 900, marginTop: 6, 
                                 color: isActive ? 'var(--text-bold)' : 'var(--text-muted)',
                                 textTransform: 'uppercase', letterSpacing: 0.5
                              }}>
                                 {s.label}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>

               {order.tracking_number && (
                 <div className="premium-card" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px dashed rgba(59, 130, 246, 0.1)', padding: 10, borderRadius: 14, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 20 }}>🚛</div>
                    <div style={{ flex: 1 }}>
                       <div style={{ fontSize: 9, fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase' }}>Tracking ID</div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontSize: 13, fontWeight: 950, color: 'var(--text-bold)' }}>{order.tracking_number}</div>
                          <button 
                             onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(order.tracking_number);
                                const tg = window.Telegram.WebApp;
                                if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                                const btn = e.currentTarget;
                                const oldHtml = btn.innerHTML;
                                btn.innerHTML = '✓';
                                setTimeout(() => btn.innerHTML = oldHtml, 2000);
                             }}
                             style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, cursor: 'pointer', opacity: 0.5 }}
                          >
                             📋
                          </button>
                       </div>
                    </div>
                    <button 
                       onClick={() => window.Telegram.WebApp.openLink(`https://www.google.com/search?q=${order.tracking_number}`)}
                       style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}
                    >
                       Track
                    </button>
                 </div>
               )}

               <div className="history-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, color: 'var(--text-muted)' }}>TOTAL SPENT</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-bold)' }}>${parseFloat(order.total).toFixed(2)}</div>
               </div>
               <style>{`
                  @keyframes pulse-ring { 0% { transform: scale(0.95); opacity: 0.5; } 100% { transform: scale(1.2); opacity: 0; } }
                  .pulse-tracker { animation: pulse-ring 1.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite; }
               `}</style>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory;
