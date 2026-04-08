import React, { useEffect, useState } from 'react';

/**
 * 💎 High-Fidelity User Profile & Order History
 * Implements the "Timeline of Excellence" design system.
 */
const UserProfile = ({ user, setView, BACKEND_URL, onViewInvoice, t, lang, toggleLang, theme, toggleTheme }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [ratingData, setRatingData] = useState({}); // { productId: { rating, comment } }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [user?.id]);

  const fetchOrders = () => {
    if (!user?.id) return;
    fetch(`${BACKEND_URL}/api/orders/user/${user.id}`, {
       headers: { 'X-TG-Data': window.Telegram.WebApp.initData }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setOrders(data.orders);
      }
      setLoading(false);
    })
    .catch(() => setLoading(false));
  };

  const submitReview = async (productId) => {
    const data = ratingData[productId];
    if (!data || !data.rating) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/review`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-TG-Data': window.Telegram.WebApp.initData
        },
        body: JSON.stringify({
          productId,
          rating: data.rating,
          comment: data.comment || '',
          userName: user.first_name
        })
      });
      const result = await res.json();
      if (result.success) {
        setRatingData(prev => {
          const next = { ...prev };
          next[productId].submitted = true;
          return next;
        });
        const tg = window.Telegram.WebApp;
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      }
    } finally { setIsSubmitting(false); }
  };

  const orderStatuses = {
    'pending': { label: t('pending_payment'), color: '#94a3b8', icon: '⏳', step: 1 },
    'paid': { label: lang === 'kh' ? 'បង់រួច' : 'Paid', color: '#10b981', icon: '💰', step: 1 },
    'processing': { label: lang === 'kh' ? 'រៀបចំ' : 'Packing', color: '#f59e0b', icon: '📦', step: 2 },
    'shipped': { label: lang === 'kh' ? 'ចេញហាង' : 'Shipped', color: '#a855f7', icon: '✨', step: 3 },
    'delivering': { label: lang === 'kh' ? 'ប្រគល់ឱ្យដឹក' : 'Delivering', color: '#3b82f6', icon: '🚚', step: 4 },
    'delivered': { label: lang === 'kh' ? 'បានទទួល' : 'Delivered', color: '#10b981', icon: '🏠', step: 4 }
  };

  if (!user) return <div className="loading-screen"><div className="loader"></div></div>;

  return (
    <div className="history-page-luxury">
      
      <div className="history-header-lux" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
           <button onClick={() => setView('home')} className="back-btn-pill">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
           </button>
           <h1 className="detail-title-mega" style={{ fontSize: 24, margin: 0 }}>{t('my_account')}</h1>
        </div>
        
        <div className="hero-actions-right">
           <div className="lang-switcher-pill" onClick={toggleLang} style={{ height: 38, padding: '0 12px' }}>
              <img src={lang === 'kh' ? 'https://flagcdn.com/w40/kh.png' : 'https://flagcdn.com/w40/gb.png'} alt="" className="lang-icon-img" style={{ width: 18, height: 18 }} />
              <span style={{ fontSize: 12 }}>{lang === 'kh' ? 'KH' : 'EN'}</span>
           </div>
           <div className="theme-toggle-pill" onClick={toggleTheme} style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              {theme === 'dark' ? '☀️' : '🌙'}
           </div>
        </div>
      </div>

      <div className="order-card-luxury" style={{ cursor: 'default', background: 'var(--profile-banner-bg)', border: '1px solid var(--border-subtle)', marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className="user-avatar-premium">
             <div className="avatar-inner-lux" style={{ 
                background: user.photo_url ? `url(${user.photo_url}) center/cover` : 'var(--bg-surface)',
                color: 'var(--text-bold)'
             }}>
                {!user.photo_url && (user.first_name?.charAt(0) || '👤')}
             </div>
             <div className="avatar-glow-ring"></div>
          </div>
          <div className="user-info-text-lux">
             <h2 className="user-name-lux">{user?.first_name || 'MO MO LOVER'} {user?.last_name || ''}</h2>
             <div className="profile-badge-luxury">
                <span className="badge-shimmer-lux"></span>
                <span style={{ position: 'relative', zIndex: 1 }}>Premium Member #{String(user?.id).slice(-4)}</span>
             </div>
          </div>
        </div>
      </div>


       <div className="section-header" style={{ padding: '0 0 15px' }}>
         <h2 style={{ fontSize: 18, fontWeight: 950, color: 'var(--text-bold)' }}>{lang === 'kh' ? 'ប្រវត្តិទិញទំនិញ' : 'Purchase History'}</h2>
         <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 800 }}>
           {orders.filter(o => o.status !== 'pending' && o.status !== 'expired').length} {t('items')}
         </span>
       </div>

       {loading ? (
         <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loader"></div></div>
       ) : orders.filter(o => o.status !== 'pending' && o.status !== 'expired').length === 0 ? (
         <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--bg-soft)', borderRadius: 28, marginBottom: 20, border: '1.5px dashed var(--border-subtle)' }}>
            <div style={{ fontSize: 44, marginBottom: 15, opacity: 0.9 }}>🛍️</div>
            <p style={{ opacity: 0.9, fontWeight: 900, fontSize: 14, color: 'var(--text-main)' }}>{lang === 'kh' ? 'មិនទាន់មានការទិញទេ' : 'No purchase history yet'}</p>
         </div>
       ) : (
        <div className="history-list">
          {orders.filter(o => o.status !== 'pending' && o.status !== 'expired').map(order => {
            const status = orderStatuses[order.status] || { label: order.status, icon: '📦', color: '#94a3b8', step: 1 };
            const isDelivered = order.status === 'delivered';
            
            return (
              <div 
                key={order.id} 
                className="order-card-luxury animate-up"
                style={{ marginBottom: 20, position: 'relative' }}
                onClick={() => onViewInvoice(order)}
              >
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                       <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{t('order_id')}</div>
                       <div style={{ fontSize: 20, fontWeight: 950, color: 'var(--text-bold)' }}>
                          MO-{String(order.id).padStart(5, '0')}
                       </div>
                    </div>
                    <div className="pill-badge" style={{ background: `${status.color}15`, color: status.color, border: `1.5px solid ${status.color}20`, fontWeight: 950 }}>
                       {status.icon} {status.label}
                    </div>
                 </div>

                 {!isDelivered && (
                    <div className="premium-timeline-lux" style={{ margin: '25px 0' }}>
                       <div className="timeline-track-bg"></div>
                       <div className="timeline-track-fill" style={{ width: `${Math.max(0, (status.step - 1) * 33.33)}%`, background: status.color }}></div>
                       <div className="timeline-steps-lux">
                          {[
                            { step: 1, icon: '💰', kh: 'បង់រួច', en: 'Paid' },
                            { step: 2, icon: '📦', kh: 'រៀបចំ', en: 'Packing' },
                            { step: 3, icon: '✨', kh: 'ចេញហាង', en: 'Shipped' },
                            { step: 4, icon: '🚚', kh: 'ដឹកជញ្ជូន', en: 'Moving' }
                          ].map((s, i) => {
                             const isActive = s.step <= status.step;
                             const isCurrent = s.step === status.step;
                             return (
                                <div key={i} className="timeline-node-lux">
                                   <div className={`node-circle-lux ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`} style={isActive ? { background: status.color } : {}}>
                                      {isActive ? (isCurrent ? s.icon : '✓') : s.icon}
                                      {isCurrent && <div className="pulse-node-lux" style={{ color: status.color }}></div>}
                                   </div>
                                   <div className={`node-label-lux ${isActive ? 'active' : ''}`}>
                                      {lang === 'kh' ? s.kh : s.en}
                                   </div>
                                </div>
                             );
                          })}
                       </div>
                    </div>
                 )}

                 {order.tracking_number && (
                    <div className="tracking-pill-lux" onClick={(e) => e.stopPropagation()}>
                       <div style={{ fontSize: 24 }}>🚚</div>
                       <div className="tracking-info-lux">
                          <div className="tracking-label-lux">{lang === 'kh' ? 'លេខតាមដានអីវ៉ាន់' : 'Courier Tracking'}</div>
                          <div className="tracking-code-lux">{order.tracking_number}</div>
                       </div>
                       <div className="copy-btn-lux" onClick={() => {
                         navigator.clipboard.writeText(order.tracking_number);
                         const tg = window.Telegram.WebApp;
                         if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                       }}>📋</div>
                    </div>
                 )}

                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <div>
                       <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{t('total')}</div>
                       <div className="mega-price-primary" style={{ fontSize: 24 }}>${parseFloat(order.total_amount || 0).toFixed(2)}</div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8 }}>
                       {isDelivered && (
                          <button 
                             onClick={(e) => { e.stopPropagation(); setRatingOrder(order); }}
                             className="detail-btn-cart-luxury" 
                             style={{ padding: '0 16px', borderRadius: 14, height: 44, background: 'var(--primary-gradient)', color: 'white', border: 'none', fontWeight: 900 }}>
                             ⭐️ {lang === 'kh' ? 'វាយតម្លៃ' : 'Rate'}
                          </button>
                       )}
                       <button className="icon-btn-glass primary-fill" style={{ width: 'auto', padding: '0 20px', borderRadius: 16, height: 48, fontSize: 13, fontWeight: 900, gap: 10 }}>
                          <span>🧾</span> {t('view_receipt')}
                       </button>
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ⭐️ Rating Modal */}
      {ratingOrder && (
        <div className="modal-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }}>
           <div className="order-card-luxury animate-up" style={{ width: '90%', maxWidth: 400, maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                 <h2 style={{ fontSize: 20, fontWeight: 950 }}>{lang === 'kh' ? 'វាយតម្លៃទំនិញ' : 'Rate Your Items'}</h2>
                 <button onClick={() => setRatingOrder(null)} style={{ background: 'none', border: 'none', fontSize: 24 }}>✕</button>
              </div>

              {JSON.parse(ratingOrder.items || '[]').map((item, idx) => {
                 const data = ratingData[item.id] || { rating: 5, comment: '', submitted: false };
                 return (
                    <div key={idx} style={{ marginBottom: 25, paddingBottom: 25, borderBottom: '1px solid var(--border-subtle)' }}>
                       <div style={{ fontWeight: 900, marginBottom: 12 }}>{item.name}</div>
                       
                       {data.submitted ? (
                          <div style={{ color: '#10b981', fontWeight: 900, fontSize: 13 }}>✅ {lang === 'kh' ? 'អរគុណសម្រាប់ការវាយតម្លៃ!' : 'Thank you for your rating!'}</div>
                       ) : (
                          <>
                             <div style={{ display: 'flex', gap: 8, marginBottom: 15 }}>
                                {[1,2,3,4,5].map(star => (
                                   <div 
                                      key={star} 
                                      onClick={() => setRatingData(prev => ({ ...prev, [item.id]: { ...data, rating: star } }))}
                                      style={{ fontSize: 28, cursor: 'pointer', filter: star <= data.rating ? 'none' : 'grayscale(1) opacity(0.3)' }}>
                                      ⭐️
                                   </div>
                                ))}
                             </div>
                             <textarea 
                                className="input-glass-admin" 
                                style={{ background: 'var(--bg-soft)', borderRadius: 12, fontSize: 13 }}
                                placeholder={lang === 'kh' ? 'សរសេមតិយោបល់...' : 'Write a comment...'}
                                value={data.comment}
                                onChange={(e) => setRatingData(prev => ({ ...prev, [item.id]: { ...data, comment: e.target.value } }))}
                             />
                             <button 
                                onClick={() => submitReview(item.id)}
                                className="detail-btn-buy-luxury" 
                                style={{ marginTop: 15, height: 44, fontSize: 13 }}>
                                {isSubmitting ? '⌛...' : (lang === 'kh' ? 'ផ្ញើមតិ' : 'Submit Review')}
                             </button>
                          </>
                       )}
                    </div>
                 );
              })}
           </div>
        </div>
      )}


      {/* 🛡 SENIOR PRINCIPAL: Help Center Ecosystem */}
      <div className="help-center-lux animate-in">
         <div className="section-header" style={{ padding: '0 0 20px' }}>
            <h2 style={{ fontSize: 20, fontWeight: 950, color: 'var(--text-bold)' }}>{lang === 'kh' ? 'មជ្ឈមណ្ឌលជំនួយ' : 'Help Center'}</h2>
         </div>

         <div className="help-grid-lux">
            <div className="help-action-card" onClick={() => window.Telegram?.WebApp?.openTelegramLink('https://t.me/momo_support')}>
               <div className="help-action-icon" style={{ background: '#ec489915' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
               </div>
               <div className="help-action-title">{lang === 'kh' ? 'ភ្នាក់ងារជំនួយ' : 'Chat with Agent'}</div>
               <div className="help-action-desc">{lang === 'kh' ? 'ក្រុមការងារតបតក្នុងពេលឆាប់ៗ' : 'Typical response: 5 mins'}</div>
            </div>
            
            <div className="help-action-card" onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}>
               <div className="help-action-icon" style={{ background: '#3b82f615' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                     <rect x="1" y="3" width="15" height="13"></rect>
                     <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                     <circle cx="5.5" cy="18.5" r="2.5"></circle>
                     <circle cx="18.5" cy="18.5" r="2.5"></circle>
                  </svg>
               </div>
               <div className="help-action-title">{lang === 'kh' ? 'តាមដានអីវ៉ាន់' : 'Track Order'}</div>
               <div className="help-action-desc">{lang === 'kh' ? 'ពិនិត្យមើលស្ថានភាពដឹក' : 'Live shipping updates'}</div>
            </div>
         </div>

         <div className="faq-section-lux">
            {[
               { id: 1, q_kh: 'តើការដឹកជញ្ជូនចំណាយពេលប៉ុន្មាន?', q_en: 'How long does delivery take?', a_kh: 'សម្រាប់ភ្នំពេញក្នុងរយ:ពេល ២៤-៤៨ ម៉ោង និងខេត្តក្រៅ ១-៣ ថ្ងៃ។', a_en: 'Typically 24-48 hours in Phnom Penh and 1-3 days for provinces.' },
               { id: 2, q_kh: 'តើខ្ញុំអាចប្តូរអីវ៉ាន់បានទេ?', q_en: 'Can I return or exchange items?', a_kh: 'លោកអ្នកអាចប្តូរបានក្នុងរយ:ពេល ៣ ថ្ងៃប្រសិនបើមានការខូចខាតពីហាង។', a_en: 'Returns or exchanges are accepted within 3 days for shop defects.' },
               { id: 3, q_kh: 'តើការបង់ប្រាក់មានអមជាមួយអ្វីខ្លះ?', q_en: 'What are the payment methods?', a_kh: 'ហាងយើងខ្ញុំទទួលការបង់តាម ABA, Bakong KHQR និងសាច់ប្រាក់សុទ្ធ។', a_en: 'We accept ABA, Bakong KHQR, and Cash on Delivery.' }
            ].map((faq) => (
               <div key={faq.id} className={`faq-item-lux ${activeFaq === faq.id ? 'open' : ''}`}>
                  <button className="faq-trigger-lux" onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}>
                     <span className="faq-q-text">{lang === 'kh' ? faq.q_kh : faq.q_en}</span>
                     <span className="faq-arrow">›</span>
                  </button>
                  <div className="faq-content-lux">
                     <p className="faq-ans-text">{lang === 'kh' ? faq.a_kh : faq.a_en}</p>
                  </div>
               </div>
            ))}
         </div>
         
         <div className="footer-social-strip">
            <a href="#" className="social-link-lux">📸</a>
            <a href="#" className="social-link-lux">📘</a>
            <a href="#" className="social-link-lux">🎵</a>
         </div>
      </div>
    </div>
  );
};

export default UserProfile;
