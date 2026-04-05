import React, { useEffect, useState } from 'react';

const PurchaseHistory = ({ setView, BACKEND_URL }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <div style={{ textAlign: 'center', padding: '100px 20px', background: 'white', borderRadius: 28, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
           <div style={{ fontSize: 60, marginBottom: 20 }}>🛍️</div>
           <h3 style={{ marginBottom: 10 }}>មិនទាន់មានការទិញទេ</h3>
           <p style={{ opacity: 0.6, fontSize: 13, marginBottom: 25 }}>រាល់ការកម្ម៉ង់របស់អ្នកនឹងបង្ហាញនៅទីនេះ។</p>
           <button onClick={() => setView('home')} className="shop-now-btn" style={{ width: '100%' }}>ទៅមើលទំនិញថ្មីៗ</button>
        </div>
      ) : (
        <div className="history-list">
          {orders.map(order => (
            <div key={order.id} className="history-card premium-card animate-in" style={{ marginBottom: 15 }}>
               <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, marginBottom: 4 }}>
                       ORDER #MO-{order.id}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>
                       {new Date(order.created_at).toLocaleDateString('km-KH', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <span className={`status-pill ${order.status}`}>
                     {order.status === 'pending' ? 'រង់ចាំពិនិត្យ' : order.status === 'delivering' ? 'កំពុងដឹកជញ្ជូន' : 'បានបញ្ចប់'}
                  </span>
               </div>

               <div className="history-items-summary" style={{ fontSize: 12, opacity: 0.7, marginBottom: 15, padding: '10px 0', borderTop: '1px solid rgba(0,0,0,0.05)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  {order.items}
               </div>

               <div className="history-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6 }}>TOTAL SPENT</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-main)' }}>${parseFloat(order.total).toFixed(2)}</div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory;
