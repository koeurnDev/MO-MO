import React, { useEffect, useState, useMemo } from 'react';
import ProfileCard from './ui/ProfileCard';
import CambodiaAddress from './ui/CambodiaAddress';
import { useShopState } from '../context/ShopContext';
import { isPaymentConfirmed, isUserPurchaseHistoryOrder } from '../utils/orderItemUtils';
import { openExternalLink, buildSocialLinkItems, buildTelLink, buildMapsLink } from '../utils/socialLinkUtils';
import SocialBrandIcon from './ui/SocialBrandIcon';

/**
 * 💎 High-Fidelity User Profile & Order History
 * Implements the "Timeline of Excellence" design system.
 */
const UserProfile = ({ user, setView, BACKEND_URL, onViewInvoice, t, lang, toggleLang, theme, toggleTheme, wishlistCount = 0 }) => {
  const {
    socialFb, socialTg, socialIg, socialTt, socialEmail, socialWa,
    shopPhone, shopAddress, shopHours, shopLogoUrl, shopName,
  } = useShopState();
  const socialLinks = useMemo(
    () => buildSocialLinkItems({ socialFb, socialTg, socialIg, socialTt, socialEmail, socialWa }),
    [socialFb, socialTg, socialIg, socialTt, socialEmail, socialWa]
  );
  const hasContactSection = socialLinks.length > 0 || shopPhone || shopAddress || shopHours;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [ratingData, setRatingData] = useState({}); // { productId: { rating, comment } }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [faqs, setFaqs] = useState([]);
  
  // Profile Data State
  const [dbProfile, setDbProfile] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchFaqs();
    fetchProfile();
  }, [user?.id]);

  const sanitizeText = (val) => {
    if (!val || typeof val !== 'string') return '';
    if (val.includes(':') || val.length > 40 || /^[0-9a-fA-F:]{30,}$/.test(val)) return '';
    return val;
  };

  const fetchProfile = () => {
    if (!user?.id) return;
    const tgInitData = window.Telegram?.WebApp?.initData || '';
    fetch(`${BACKEND_URL}/api/user/profile`, {
       headers: { 'X-TG-Data': tgInitData }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.profile) {
        const cleanPhone = sanitizeText(data.profile.phone);
        const cleanAddr = sanitizeText(data.profile.address);
        setDbProfile({ ...data.profile, phone: cleanPhone, address: cleanAddr });
        setEditPhone(cleanPhone);
        setEditAddress(cleanAddr);
      }
    })
    .catch(err => console.error('Failed to fetch profile:', err));
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    setIsSavingProfile(true);
    try {
      const tgInitData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${BACKEND_URL}/api/user/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-TG-Data': tgInitData 
        },
        body: JSON.stringify({ phone: editPhone, address: editAddress })
      });
      const data = await res.json();
      if (data.success && data.profile) {
        const cleanPhone = sanitizeText(data.profile.phone);
        const cleanAddr = sanitizeText(data.profile.address);
        setDbProfile({ ...data.profile, phone: cleanPhone, address: cleanAddr });
        setIsEditingProfile(false);
        const tg = window.Telegram?.WebApp;
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('success');
        }
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const fetchFaqs = () => {
    fetch(`${BACKEND_URL}/api/faqs`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFaqs(data.faqs);
        }
      })
      .catch(err => console.error('Failed to fetch FAQs:', err));
  };

  const fetchOrders = () => {
    if (!user?.id) return;
    const tgInitData = window.Telegram?.WebApp?.initData || '';
    fetch(`${BACKEND_URL}/api/user/orders`, {
       headers: { 'X-TG-Data': tgInitData }
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
    const data = ratingData[productId] || { rating: 5, comment: '' };
    if (!data.rating) return;

    setIsSubmitting(true);
    try {
      const tgInitData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${BACKEND_URL}/api/reviews`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-TG-Data': tgInitData
        },
        body: JSON.stringify({
          product_id: productId,
          rating: data.rating,
          comment: data.comment || ''
        })
      });
      const result = await res.json();
      if (result.success) {
        setRatingData(prev => ({
          ...prev,
          [productId]: { ...data, submitted: true }
        }));
        const tg = window.Telegram?.WebApp;
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      } else {
        alert(result.error || 'Failed to submit review');
      }
    } finally { setIsSubmitting(false); }
  };

  const orderStatuses = {
    'pending':    { label: t('pending_payment'),                              color: '#94a3b8', icon: '⏳', step: 0 },
    'paid':       { label: lang === 'kh' ? 'បង់រួច'     : 'Paid',      color: '#10b981', icon: '✓',  step: 1 },
    'processing': { label: lang === 'kh' ? 'រៀបចំ'       : 'Packing',   color: '#f59e0b', icon: '📦', step: 2 },
    'shipped':    { label: lang === 'kh' ? 'កំពុងដឹក'    : 'Courier',   color: '#a855f7', icon: '🚚', step: 3 },
    'delivering': { label: lang === 'kh' ? 'កំពុងដឹក'    : 'Courier',   color: '#3b82f6', icon: '🚚', step: 3 },
    'delivered':  { label: lang === 'kh' ? 'បានដល់'     : 'Delivered',  color: '#10b981', icon: '🏠', step: 3 }
  };

  if (!user) return <div className="loading-screen"><div className="loader"></div></div>;

  return (
    <div className="history-page-luxury">
      
      <div className="history-header-lux" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
           <button type="button" onClick={() => setView('home')} className="back-btn-pill back-btn-pill--icon" aria-label="Back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
           </button>
           <h1 className="profile-page-title">{t('my_account')}</h1>
        </div>
        
        <div className="hero-actions-right">
           <div className="lang-switcher-pill" onClick={toggleLang} role="button" tabIndex={0}>
              <img src={lang === 'kh' ? 'https://flagcdn.com/w40/kh.png' : 'https://flagcdn.com/w40/gb.png'} alt="" className="lang-icon-img" />
              <span>{lang === 'kh' ? 'KH' : 'EN'}</span>
           </div>
           <div className="theme-toggle-pill" onClick={toggleTheme} role="button" tabIndex={0}>
              {theme === 'dark' ? '☀️' : '🌙'}
           </div>
        </div>
      </div>

      <ProfileCard 
        name={`${user?.first_name || 'MARUN MINI STORE LOVER'} ${user?.last_name || ''}`}
        role={`Premium Member #${String(user?.id).slice(-4)}`}
        imageUrl={user?.photo_url || `https://ui-avatars.com/api/?name=${user?.first_name || 'User'}&background=random`}
      />

      <button type="button" className="profile-favorites-link" onClick={() => setView('wishlist')}>
        <span className="profile-favorites-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.82-8.82 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </span>
        <span className="profile-favorites-text">
          {lang === 'kh' ? 'សំណព្វ' : 'Favorites'}
        </span>
        <span className="profile-favorites-count">{wishlistCount}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {dbProfile && (
        <div className="glass-card-luxury profile-info-card">
          <div className="profile-info-head">
            <div className="profile-info-title">{lang === 'kh' ? 'ព័ត៌មានរបស់ខ្ញុំ' : 'My Information'}</div>
            {!isEditingProfile ? (
              <button type="button" className="profile-info-edit-btn" onClick={() => setIsEditingProfile(true)}>
                {lang === 'kh' ? 'កែប្រែ' : 'Edit'}
              </button>
            ) : (
              <button type="button" className="profile-info-cancel-btn" onClick={() => setIsEditingProfile(false)}>
                {lang === 'kh' ? 'បោះបង់' : 'Cancel'}
              </button>
            )}
          </div>

          <div className="profile-loyalty-row">
            <div className="profile-loyalty-icon">pts</div>
            <div>
              <div className="profile-loyalty-label">{lang === 'kh' ? 'ពិន្ទុសន្សំ' : 'Loyalty Points'}</div>
              <div className="profile-loyalty-value">{dbProfile.loyalty_points || 0} pts</div>
            </div>
          </div>

          {!isEditingProfile ? (
            <div className="profile-info-view">
              <div className="profile-info-line">
                <span className="profile-info-line-label">{lang === 'kh' ? 'លេខទូរស័ព្ទ' : 'Phone'}</span>
                <span className="profile-info-line-value">{sanitizeText(dbProfile.phone) || (lang === 'kh' ? 'មិនទាន់មាន' : 'Not set')}</span>
              </div>
              <div className="profile-info-line">
                <span className="profile-info-line-label">{lang === 'kh' ? 'អាសយដ្ឋាន' : 'Address'}</span>
                <span className="profile-info-line-value">{sanitizeText(dbProfile.address) || (lang === 'kh' ? 'មិនទាន់មាន' : 'Not set')}</span>
              </div>
            </div>
          ) : (
            <div className="profile-info-form">
              <div>
                <label className="profile-form-label">
                  {lang === 'kh' ? 'លេខទូរស័ព្ទ' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  className="input-glass-admin profile-form-input"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="012 345 678"
                />
              </div>
              <div>
                <label className="profile-form-label">
                  {lang === 'kh' ? 'អាសយដ្ឋានដឹកជញ្ជូន' : 'Delivery Address'}
                </label>
                <div className="profile-address-box">
                  <CambodiaAddress
                    value={editAddress}
                    onChange={(val) => setEditAddress(val)}
                    lang={lang}
                  />
                </div>
              </div>
              <button
                type="button"
                className="profile-save-btn"
                onClick={saveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (lang === 'kh' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'kh' ? 'រក្សាទុក' : 'Save')}
              </button>
            </div>
          )}
        </div>
      )}


       <div className="section-header" style={{ padding: '0 0 15px' }}>
         <h2 style={{ fontSize: 18, fontWeight: 950, color: 'var(--text-bold)' }}>{lang === 'kh' ? 'ប្រវត្តិការទិញ' : 'Purchase History'}</h2>
         <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 800 }}>
           {orders.filter(isUserPurchaseHistoryOrder).length} {t('items')}
         </span>
       </div>

       {loading ? (
         <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loader"></div></div>
       ) : orders.filter(isUserPurchaseHistoryOrder).length === 0 ? (
         <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--bg-soft)', borderRadius: 20, marginBottom: 20, border: '1.5px dashed var(--border-subtle)' }}>
            <div style={{ fontSize: 44, marginBottom: 15, opacity: 0.9 }}>🛍️</div>
            <p style={{ opacity: 0.9, fontWeight: 900, fontSize: 14, color: 'var(--text-main)' }}>{lang === 'kh' ? 'មិនទាន់មានការទិញទេ' : 'No purchase history yet'}</p>
         </div>
       ) : (
        <div className="history-list">
          {orders.filter(isUserPurchaseHistoryOrder).map(order => {
            const status = orderStatuses[order.status] || { label: order.status, icon: '📦', color: '#94a3b8', step: 0 };
            const isDelivered = order.status === 'delivered';
            const canRate = ['shipped', 'delivering', 'delivered'].includes(order.status);
            const paymentConfirmed = isPaymentConfirmed(order.status);
            const showTracker = paymentConfirmed && !isDelivered && !canRate;
            
            return (
              <div 
                key={order.id} 
                className="order-card-luxury animate-up"
                style={{ marginBottom: 16, position: 'relative', cursor: paymentConfirmed ? 'pointer' : 'default' }}
                onClick={() => paymentConfirmed && onViewInvoice(order)}
              >
                 <div className="order-meta-lux" style={{ marginBottom: 16 }}>
                    <div>
                       <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                         {lang === 'kh' ? 'លេខសម្គាល់' : 'Order ID'}
                       </div>
                       <div className="order-id-numeric">
                          {order.order_code || String(order.id)}
                       </div>
                    </div>
                    <div className="pill-badge" style={{ background: `${status.color}15`, color: status.color, border: `1px solid ${status.color}30`, fontWeight: 800, fontSize: 12 }}>
                       {status.icon} {status.label}
                    </div>
                 </div>

                 {showTracker && (
                    <div className="premium-timeline-lux" style={{ margin: '18px 0 8px' }}>
                       <div className="timeline-track-bg"></div>
                       <div className="timeline-track-fill" style={{ width: `${Math.max(0, (status.step - 1) * 50)}%`, background: status.color }}></div>
                       <div className="timeline-steps-lux">
                          {[
                            { step: 1, icon: '✓', kh: 'បង់រួច', en: 'Paid' },
                            { step: 2, icon: '📦', kh: 'រៀបចំ', en: 'Packing' },
                            { step: 3, icon: '🚚', kh: 'កំពុងដឹក', en: 'Courier' }
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
                       <div style={{ fontSize: 20 }}>🚚</div>
                       <div className="tracking-info-lux">
                          <div className="tracking-label-lux">{lang === 'kh' ? 'លេខតាមដាន' : 'Tracking'}</div>
                          <div className="tracking-code-lux">{order.tracking_number}</div>
                       </div>
                       <div className="copy-btn-lux" onClick={() => {
                         navigator.clipboard.writeText(order.tracking_number);
                         const tg = window.Telegram?.WebApp;
                         if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                       }}>📋</div>
                    </div>
                 )}

                 <div className="order-card-footer">
                    <div>
                       <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>
                         {lang === 'kh' ? 'សរុប' : 'Total'}
                       </div>
                       <div className="mega-price-primary" style={{ fontSize: 22 }}>
                         ${parseFloat(order.total || order.total_amount || 0).toFixed(2)}
                       </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8 }}>
                       {canRate && (
                          <button 
                             onClick={(e) => { e.stopPropagation(); setRatingOrder(order); }}
                             className="order-action-btn order-action-btn-primary">
                             ★ {lang === 'kh' ? 'វាយតម្លៃ' : 'Rate'}
                          </button>
                       )}
                       {paymentConfirmed && (
                          <button 
                             onClick={(e) => { e.stopPropagation(); onViewInvoice(order); }}
                             className="order-action-btn">
                             {lang === 'kh' ? 'វិក្កយបត្រ' : 'Receipt'}
                          </button>
                       )}
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
                                placeholder={lang === 'kh' ? 'សរសេរមតិយោបល់...' : 'Write a comment...'}
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
      {faqs.length > 0 && (
         <div className="faq-section-lux" style={{ marginTop: 30 }}>
            <div className="section-header" style={{ padding: '0 0 20px' }}>
               <h2 style={{ fontSize: 20, fontWeight: 950, color: 'var(--text-bold)' }}>{lang === 'kh' ? 'សំណួរដែលសួរញឹកញាប់' : 'FAQs'}</h2>
            </div>
            {faqs.map((faq) => (
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
      )}

      {/* 📱 Contact Us Section */}
      {hasContactSection && (
         <div className="contact-section-lux" style={{ marginTop: 30, paddingBottom: 40 }}>
            <div className="contact-shop-header contact-link-row">
              <div className="contact-link-icon-slot">
                {shopLogoUrl ? (
                  <img src={shopLogoUrl} alt="" className="contact-shop-logo" />
                ) : (
                  <div className="contact-shop-logo contact-shop-logo--placeholder">M</div>
                )}
              </div>
              <div className="contact-link-text-block">
                <h2 className="contact-shop-title">
                  {shopName || (lang === 'kh' ? 'ទំនាក់ទំនងយើងខ្ញុំ' : 'Contact Us')}
                </h2>
                <p className="contact-shop-subtitle">
                  {lang === 'kh' ? 'ទាក់ទងយើងតាមរយៈឆានែលណាមួយ' : 'Reach us on any channel'}
                </p>
              </div>
            </div>

            {(shopPhone || shopHours || shopAddress) && (
              <div className="contact-info-rows">
                {shopPhone && (
                  <button type="button" className="contact-info-row" onClick={() => openExternalLink(buildTelLink(shopPhone))}>
                    <span className="contact-info-icon">📞</span>
                    <span className="contact-info-text">
                      <span className="contact-info-label">{lang === 'kh' ? 'ទូរស័ព្ទ' : 'Phone'}</span>
                      <span className="contact-info-value">{shopPhone}</span>
                    </span>
                  </button>
                )}
                {shopHours && (
                  <div className="contact-info-row contact-info-row--static">
                    <span className="contact-info-icon">🕐</span>
                    <span className="contact-info-text">
                      <span className="contact-info-label">{lang === 'kh' ? 'ម៉ោងបើក' : 'Hours'}</span>
                      <span className="contact-info-value">{shopHours}</span>
                    </span>
                  </div>
                )}
                {shopAddress && (
                  <button type="button" className="contact-info-row" onClick={() => openExternalLink(buildMapsLink(shopAddress))}>
                    <span className="contact-info-icon">📍</span>
                    <span className="contact-info-text">
                      <span className="contact-info-label">{lang === 'kh' ? 'ទីតាំង' : 'Address'}</span>
                      <span className="contact-info-value">{shopAddress}</span>
                    </span>
                  </button>
                )}
              </div>
            )}

            {socialLinks.length > 0 && (
              <>
                {(shopPhone || shopHours || shopAddress) && (
                  <>
                    <div className="contact-section-divider" aria-hidden="true" />
                    <p className="contact-social-heading">
                      {lang === 'kh' ? 'បណ្ដាញសង្គម' : 'Social media'}
                    </p>
                  </>
                )}
                <div className="social-links-grid">
                  {socialLinks.map((link) => (
                    <button
                      key={link.id}
                      type="button"
                      className="social-link-chip contact-link-row"
                      onClick={() => openExternalLink(link.url)}
                    >
                      <span className="contact-link-icon-slot">
                        <span
                          className={`social-chip-icon${link.darkIcon ? ' social-chip-icon--dark' : ''}`}
                          style={{ background: link.gradient || link.color }}
                          aria-hidden="true"
                        >
                          <SocialBrandIcon id={link.id} />
                        </span>
                      </span>
                      <span className="social-chip-label contact-link-text-block">{link.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
         </div>
      )}

      </div>
  );
};

export default UserProfile;
