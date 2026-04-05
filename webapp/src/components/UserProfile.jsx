import React, { useEffect, useState } from 'react';

const UserProfile = ({ user, setView, BACKEND_URL, onViewInvoice }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = () => {
    if (!user?.id) return;
    fetch(`${BACKEND_URL}/api/orders/user/${user.id}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setOrders(data.orders);
      }
      setLoading(false);
    })
    .catch(() => setLoading(false));
  };

  const statusMap = {
    'pending': { label: 'រង់ចាំបង់ប្រាក់', color: '#94a3b8', icon: '⏳', step: 0 },
    'paid': { label: 'បង់ប្រាក់រួចរាល់', color: '#10b981', icon: '✅', step: 1 },
    'processing': { label: 'រៀបចំអីវ៉ាន់-Preparing', color: '#f59e0b', icon: '📦', step: 1 },
    'shipped': { label: 'អីវ៉ាន់បានចេញ-Dispatched', color: '#a855f7', icon: '✨', step: 2 },
    'delivering': { label: 'កំពុងដឹក-Out for Delivery', color: '#3b82f6', icon: '🚚', step: 3 },
    'delivered': { label: 'បានដល់ដៃ-Delivered', color: '#10b981', icon: '🏠', step: 3 }
  };

  const handleContact = () => {
    try {
      window.Telegram.WebApp.openTelegramLink('https://t.me/MOMOCambodia'); 
    } catch {
      window.open('https://t.me/MOMOCambodia', '_blank');
    }
  };

  const userAvatar = window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;

  return (
    <div className="profile-page animate-in" style={{ padding: '20px', paddingBottom: '100px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 25 }}>
        <button onClick={() => setView('home')} className="back-btn-pill">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>គណនីខ្ញុំ</h1>
      </div>

      <div className="user-card-luxury">
        <div className="user-avatar-large" style={userAvatar ? { background: `url(${userAvatar}) center/cover` } : {}}>
           {!userAvatar && '👤'}
        </div>
        <div className="user-details-large">
           <h2>{user?.first_name || 'MO MO LOVER'} {user?.last_name || ''}</h2>
           <p className="user-id-badge">ID: {user?.id || 'Premium Member'}</p>
        </div>
      </div>

      {/* 💎 LUXURY VIP CARD */}
      {(() => {
        const points = parseFloat(user?.loyalty_points || 0);
        let rank = "Bronze Member";
        let rankClass = "bronze";
        let nextRank = "Silver";
        let nextPoints = 101;
        
        if (points > 1500) { rank = "Diamond VIP 💎"; rankClass = "diamond"; nextRank = "MAX"; nextPoints = points; }
        else if (points > 500) { rank = "Gold Member"; rankClass = "gold"; nextRank = "Diamond"; nextPoints = 1501; }
        else if (points > 100) { rank = "Silver Member"; rankClass = "silver"; nextRank = "Gold"; nextPoints = 501; }

        const progress = Math.min(100, (points / nextPoints) * 100);

        return (
          <div className={`vip-card-boutique ${rankClass} animate-in`} style={{ marginBottom: 25 }}>
             <div className="vip-card-glass">
                <div className="vip-header">
                   <span className="vip-label">VIP STATUS</span>
                   <span className="vip-diamonds">💎 {Math.floor(points)} Diamonds</span>
                </div>
                <div className="vip-rank-name">{rank}</div>
                <div className="vip-progress-container">
                   <div className="vip-progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="vip-footer">
                   <span>Next Level: {nextRank}</span>
                   <span>{nextPoints > points ? `${nextPoints - Math.floor(points)} to go` : 'MAX LEVEL'}</span>
                </div>
             </div>
          </div>
        );
      })()}

      <div className="settings-menu-list" style={{ marginBottom: 30 }}>
        <div className="settings-group-title">ការកំណត់</div>
        <div className="settings-item" onClick={handleContact}>
           <div className="settings-icon" style={{ background: '#ec4899', color: 'white' }}>💬</div>
           <div className="settings-text">ទាក់ទងជំនួយ
              <span>ជជែកជាមួយភ្នាក់ងារ</span>
           </div>
           <div className="settings-arrow">›</div>
        </div>
      </div>

      <div className="orders-section-header" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900 }}>តាមដានការទិញ 🚚</h2>
        <span style={{ fontSize: 12, opacity: 0.6 }}>{orders.length} orders</span>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ position: 'relative', height: 150 }}><div className="loader"></div></div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
           <div style={{ fontSize: 40, marginBottom: 15 }}>🛍️</div>
           <h3 style={{ marginBottom: 5 }}>មិនទាន់មានការទិញទេ</h3>
           <p style={{ opacity: 0.6, fontSize: 13, marginBottom: 20 }}>រាល់ការកម្ម៉ង់របស់អ្នកនឹងបង្ហាញនៅទីនេះ។</p>
           <button onClick={() => setView('home')} className="shop-now-btn" style={{ width: '100%', fontSize: 14, height: 48 }}>ទិញទំនិញឥឡូវនេះ</button>
        </div>
      ) : (
        <div className="history-list">
          {orders.map(order => {
            const status = statusMap[order.status] || { label: order.status, icon: '📦', color: '#94a3b8', step: 1 };
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

            return (
              <div key={order.id} className="history-card premium-card animate-in" style={{ marginBottom: 20, padding: 20 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.4 }}>#{new Date(order.created_at).getTime()}</div>
                      <div style={{ fontSize: 15, fontWeight: 900 }}>MO-{order.id}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                       <span style={{ background: `${status.color}15`, color: status.color, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                          {status.icon} {status.label}
                       </span>
                    </div>
                 </div>

                 {/* 🛤️ PROGRESS BAR TRACKER */}
                 <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '20px 0 30px' }}>
                    <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '2px', background: '#f1f5f9', zIndex: 0, transform: 'translateY(-50%)' }}></div>
                    <div style={{ position: 'absolute', top: '50%', left: 0, width: `${(status.step - 1) * 25}%`, height: '2px', background: '#ec4899', zIndex: 1, transform: 'translateY(-50%)', transition: 'width 0.5s ease-in-out' }}></div>
                    
                    {[1, 2, 3, 4, 5].map(s => (
                       <div key={s} style={{ 
                         width: s <= status.step ? '12px' : '8px', 
                         height: s <= status.step ? '12px' : '8px', 
                         borderRadius: '50%', 
                         background: s <= status.step ? '#ec4899' : '#cbd5e1', 
                         zIndex: 2,
                         border: s <= status.step ? '3px solid white' : 'none',
                         boxShadow: s <= status.step ? '0 0 10px rgba(236,72,153,0.4)' : 'none'
                       }}></div>
                    ))}
                 </div>

                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                       <div style={{ fontSize: 10, opacity: 0.4, fontWeight: 800 }}>TOTAL AMOUNT</div>
                       <div style={{ fontSize: 18, fontWeight: 900 }}>${parseFloat(order.total).toFixed(2)}</div>
                    </div>
                    <button onClick={() => onViewInvoice(order)} style={{ background: '#1e1b4b', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 12, fontSize: 12, fontWeight: 800 }}>
                       🧾 បញ្ជាក់ទិញ
                    </button>
                 </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default UserProfile;
