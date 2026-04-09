import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useTelegram } from '../context/TelegramContext';

/**
 * 🎨 Success Animation (Luxury Checkmark)
 */
const SuccessCheckmark = () => (
  <div className="checkmark-wrapper">
    <svg className="checkmark-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
      <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
    </svg>
    <style>{`
      .checkmark-wrapper { width: 80px; height: 80px; margin: 0 auto 30px; position: relative; }
      .checkmark-circle { stroke-dasharray: 166; stroke-dashoffset: 166; stroke-width: 2; stroke-miterlimit: 10; stroke: var(--primary-accent); fill: none; animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards; }
      .checkmark-svg { width: 80px; height: 80px; border-radius: 50%; display: block; stroke-width: 2; stroke: white; stroke-miterlimit: 10; animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both; }
      .checkmark-check { transform-origin: 50% 50%; stroke-dasharray: 48; stroke-dashoffset: 48; animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards; }
      @keyframes stroke { 100% { stroke-dashoffset: 0; } }
      @keyframes scale { 0%, 100% { transform: none; } 50% { transform: scale3d(1.1, 1.1, 1); } }
      @keyframes fill { 100% { box-shadow: inset 0px 0px 0px 40px var(--primary-accent); } }
    `}</style>
  </div>
);

/**
 * 🧾 High-Fidelity Invoice Modal
 * Matches the "Digital Parchment" luxury design.
 */
const InvoiceModal = ({ order, onClose, paymentQrUrl, paymentInfo, BACKEND_URL, onPaymentSuccess, t, lang }) => {
  const { switchInlineQuery } = useTelegram();
  const [localOrder, setLocalOrder] = useState(order);
  const [timeLeft, setTimeLeft] = useState(300);
  const [showReceipt, setShowReceipt] = useState(false);
  const [miniQrUrl, setMiniQrUrl] = useState('');
  const [dynamicQr, setDynamicQr] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [attempts, setAttempts] = useState(0);
  
  // 🔄 Sync local order when parent prop updates (Essential for Draft -> Real transition)
  useEffect(() => {
    if (order) setLocalOrder(order);
  }, [order]);

  if (!localOrder) return null;
  
  const isDraft = localOrder.id === 'DRAFT';
  const displayId = isDraft ? '...' : (localOrder.order_code || localOrder.id);
  const dbId = localOrder.id;
  const items = typeof localOrder.items === 'string' ? JSON.parse(localOrder.items) : localOrder.items;

  const orderStatus = localOrder.status;

  // 🕒 SERVER-SYNCED TIMER: Direct sync with Server's expires_in
  useEffect(() => {
    if (orderStatus === 'paid' || isExpired) return;

    // Use server's remaining time directly
    const initialRemaining = localOrder.expires_in !== undefined ? localOrder.expires_in : 300;
    
    setTimeLeft(initialRemaining);
    if (initialRemaining <= 0 && !isDraft) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderStatus, isDraft, localOrder.expires_in, isExpired]);

  useEffect(() => {
    if (showReceipt) {
      QRCode.toDataURL(`https://t.me/momo_boutique_bot?start=check_${dbId}`, { width: 120, margin: 1 })
      .then(url => setMiniQrUrl(url));
    }
  }, [showReceipt, dbId]);

  useEffect(() => {
    if (localOrder?.qr_string) {
      QRCode.toDataURL(localOrder.qr_string, { 
        width: 400, 
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' } // 🛡 Force High Contrast for Scanners
      })
        .then(url => setDynamicQr(url))
        .catch(err => console.error("QR Generate Fail:", err));
    }
  }, [localOrder?.qr_string]);

  // 🚀 HARDENED: Exponential Backoff Polling with Network Resilience
  useEffect(() => {
    if (orderStatus === 'paid' || isExpired || isDraft) return;

    // 🚀 ULTRA-FAST: 500ms for first 10 attempts (5 seconds), then 1s, then backing off.
    const currentDelay = attempts < 10 ? 500 : attempts < 20 ? 1000 : attempts < 40 ? 3000 : 10000;

    const interval = setTimeout(async () => {
      const tgData = window.Telegram?.WebApp?.initData || '';
      
      try {
        const res = await fetch(`${BACKEND_URL}/api/orders/status/${localOrder.order_code}`, {
          headers: { 'X-TG-Data': tgData }
        });
        const data = await res.json();
        
        setIsOffline(false); // Reset network failure state
        setAttempts(prev => prev + 1);

        if (data.success) {
          setLocalOrder(data.order);
          if (data.status === 'paid') {
            if (onPaymentSuccess) onPaymentSuccess();
            setTimeout(() => {
              setShowReceipt(true);
              window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
            }, 1000);
          }
        }
      } catch (err) {
        console.warn('📡 Network Flickering. Retrying...');
        setIsOffline(true);
        setAttempts(prev => prev + 1);
      }
    }, currentDelay);

    return () => clearTimeout(interval);
  }, [localOrder.order_code, orderStatus, attempts, BACKEND_URL, onPaymentSuccess, isExpired]);

  const handleRefreshQR = async () => {
    setIsVerifying(true);
    const tgData = window.Telegram?.WebApp?.initData || '';
    try {
      // Polling status triggers a self-healing refresh on the server if it's stale
      const res = await fetch(`${BACKEND_URL}/api/orders/status/${localOrder.order_code}`, {
        headers: { 'X-TG-Data': tgData }
      });
      const data = await res.json();
      if (data.success) {
        setLocalOrder(data.order);
        setIsExpired(false);
        setAttempts(0);
        if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
      }
    } catch (err) {
      console.error("Refresh Fail:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const renderReceipt = () => (
    <div className="receipt-luxury-paper animate-up">
       <div className="receipt-header-lux" style={{ marginBottom: 32 }}>
          <div style={{ padding: '8px', background: 'white', borderRadius: '24px', boxShadow: '0 8px 16px rgba(0,0,0,0.05)', display: 'inline-block', marginBottom: 12 }}>
            <img src="/favicon.png" alt="MO MO" style={{ width: 80, height: 80, borderRadius: '18px', display: 'block' }} />
          </div>
          <div className="receipt-tagline-lux" style={{ letterSpacing: 4, fontSize: 13, color: '#d4af37', fontWeight: 900 }}>MO MO BOUTIQUE LUXURY</div>
       </div>

       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
             <div className="order-id-lux">{t('order_id')}</div>
             <div style={{ fontWeight: 950, fontSize: 13 }}>#{displayId}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
             <div className="order-id-lux">{t('order_date')}</div>
              <div style={{ fontWeight: 950, fontSize: 13 }}>
                {!isDraft && new Date(localOrder.created_at).toLocaleString(lang === 'kh' ? 'km-KH' : 'en-US', {
                   year: 'numeric',
                   month: '2-digit',
                   day: '2-digit',
                   hour: '2-digit',
                   minute: '2-digit',
                   hour12: true
                })}
              </div>
          </div>
       </div>

       {/* 👤 Customer & Shipping Section */}
       <div style={{ background: 'var(--bg-soft)', borderRadius: '16px', padding: '16px', marginBottom: 24, border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
             <div style={{ fontSize: 20 }}>👤</div>
             <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{lang === 'kh' ? 'អតិថិជន' : 'Customer'}</div>
                <div style={{ fontWeight: 950, fontSize: 14 }}>{localOrder.user_name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-main)', opacity: 0.8 }}>{localOrder.phone}</div>
             </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
             <div style={{ fontSize: 20 }}>📍</div>
             <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{lang === 'kh' ? 'អាសយដ្ឋានដឹក' : 'Shipping'}</div>
                <div style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 700, lineHeight: 1.4 }}>
                   {localOrder.address}, {localOrder.province}
                </div>
                <div style={{ fontSize: 12, color: 'var(--primary-accent)', fontWeight: 900, marginTop: 4 }}>
                   🚚 {localOrder.delivery_company}
                </div>
             </div>
          </div>
       </div>

       {/* Item Breakdown */}
       <div style={{ marginTop: 32 }}>
          <div className="order-id-lux" style={{ marginBottom: 16 }}>{t('items')}</div>
          {items && items.map((item, idx) => (
            <div key={idx} className="receipt-summary-item">
               <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{item.name} <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>x{item.quantity}</span></div>
               <div style={{ fontWeight: 950 }}>${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
            </div>
          ))}
       </div>

       {/* 💰 Detailed Price Breakdown */}
       <div style={{ marginTop: 32 }}>
          <div className="order-id-lux" style={{ marginBottom: 16 }}>{lang === 'kh' ? 'សេចក្តីលម្អិតតម្លៃ' : 'Price Breakdown'}</div>
          
          <div className="receipt-summary-item" style={{ marginBottom: 8 }}>
             <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>{lang === 'kh' ? 'សរុបដើម' : 'Subtotal'}</div>
             <div style={{ fontWeight: 800 }}>${parseFloat(localOrder.subtotal || localOrder.total).toFixed(2)}</div>
          </div>

          {(parseFloat(localOrder.discount_amount) > 0) && (
            <div className="receipt-summary-item" style={{ marginBottom: 8, color: '#ef4444' }}>
               <div style={{ fontSize: 13, fontWeight: 700 }}>{lang === 'kh' ? 'បញ្ចុះតម្លៃ' : 'Discount'}</div>
               <div style={{ fontWeight: 800 }}>-${parseFloat(localOrder.discount_amount).toFixed(2)}</div>
            </div>
          )}

          <div className="receipt-summary-item" style={{ marginBottom: 16 }}>
             <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>{lang === 'kh' ? 'ថ្លៃដឹកជញ្ជូន' : 'Delivery Fee'}</div>
             <div style={{ fontWeight: 800 }}>{parseFloat(localOrder.delivery_fee) === 0 ? (lang === 'kh' ? 'ឥតគិតថ្លៃ' : 'Free') : `$${parseFloat(localOrder.delivery_fee).toFixed(2)}`}</div>
          </div>
       </div>

       <div className="receipt-divider-dash"></div>

       <div className="receipt-total-row" style={{ marginTop: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 950, color: 'var(--text-bold)' }}>{t('final_total')}</span>
          <span className="mega-price-primary" style={{ fontSize: 36, color: '#d4af37' }}>${parseFloat(localOrder.total).toFixed(2)}</span>
        </div>

       {/* 🆔 Serial & Information Section */}
       <div style={{ textAlign: 'center', marginTop: 32, padding: '20px', border: '1px dashed var(--border-color)', borderRadius: '16px', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{lang === 'kh' ? 'លេខសម្គាល់ប្រតិបត្តិការ' : 'Serial Number'}</div>
          <div style={{ fontSize: 20, fontWeight: 950, color: 'var(--primary-accent)', letterSpacing: 1 }}>{displayId}</div>
       </div>

       {/* 📜 Terms & Conditions */}
       <div style={{ marginTop: 32, padding: '0 8px' }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-bold)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
             <span style={{ fontSize: 16 }}>📜</span> {lang === 'kh' ? 'លក្ខខណ្ឌផ្សេងៗ' : 'Terms & Conditions'}
          </div>
          <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
             {[
                lang === 'kh' ? '• ទំនិញទិញហើយមិនអាចប្តូរជាសាច់ប្រាក់វិញបានទេ។' : '• Items purchased are non-refundable.',
                lang === 'kh' ? '• អាចប្តូរទំនិញបានក្នុងរយៈពេល ៣ ថ្ងៃ (ត្រូវមានវិក្កយបត្រ)។' : '• Exchange within 3 days (Receipt required).',
                lang === 'kh' ? '• សូមរក្សាទុកវិក្កយបត្រនេះដើម្បីផ្ទៀងផ្ទាត់។' : '• Please keep this receipt for verification.'
             ].map((text, i) => (
                <li key={i} style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.4 }}>{text}</li>
             ))}
          </ul>
       </div>

       {/* Verification QR */}
       <div style={{ textAlign: 'center', marginTop: 40, padding: '24px', background: 'var(--bg-soft)', borderRadius: '28px' }}>
          <img src={miniQrUrl} alt="" style={{ width: 100, height: 100, marginBottom: 12, borderRadius: 12, filter: 'contrast(1.1)' }} />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.5 }}>{lang === 'kh' ? 'ស្កេនដើម្បីផ្ទៀងផ្ទាត់' : 'Scan to Verify'}</div>
       </div>

       {/* 🛡️ Trust Badges Section */}
       <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center', gap: 20, opacity: 0.8 }}>
          <div style={{ textAlign: 'center' }}>
             <div style={{ fontSize: 24, marginBottom: 4 }}>✅</div>
             <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{lang === 'kh' ? 'ទំនិញសុទ្ធ' : 'Authentic'}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
             <div style={{ fontSize: 24, marginBottom: 4 }}>🛡️</div>
             <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{lang === 'kh' ? 'សុវត្ថិភាព' : 'Secure'}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
             <div style={{ fontSize: 24, marginBottom: 4 }}>🚚</div>
             <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{lang === 'kh' ? 'ដឹកជញ្ជូនរហ័ស' : 'Fast Delivery'}</div>
          </div>
       </div>

       <div style={{ textAlign: 'center', marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
               onClick={() => {
                  const shareText = `🛍️ MO MO Boutique\n${t('order_id')}: #${String(displayId).substring(0, 8)}...\n${t('final_total')}: $${parseFloat(localOrder.total).toFixed(2)}`;
                  switchInlineQuery(shareText, ['users', 'chats', 'groups', 'channels']);
               }}
               className="detail-btn-cart-luxury"
               style={{ flex: 1, height: 50, fontSize: 14 }}>
               📤 {lang === 'kh' ? 'ចែករំលែក' : 'Share'}
            </button>
            <a 
               href="https://t.me/momo_support" 
               target="_blank" 
               rel="noreferrer"
               className="detail-btn-cart-luxury"
               style={{ flex: 1, height: 50, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: 'var(--bg-soft)', color: 'var(--text-bold)' }}>
               💬 {lang === 'kh' ? 'ជំនួយ' : 'Support'}
            </a>
          </div>
          <button onClick={() => setShowReceipt(false)} className="back-btn-pill" style={{ width: '100%', height: 50, borderRadius: 16 }}>{t('close')}</button>
       </div>
    </div>
  );

  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'var(--glass-bg)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '90%', maxWidth: '400px' }}>
        
        {isExpired ? (
          <div className="order-card-luxury animate-in" style={{ padding: '60px 30px 40px', textAlign: 'center', borderColor: '#fee2e2' }}>
             <div style={{ fontSize: '70px', marginBottom: '25px' }}>⏳</div>
             <h2 style={{ fontSize: '24px', fontWeight: '950', color: 'var(--text-bold)', marginBottom: '12px' }}>{lang === 'kh' ? 'ការកុម្ម៉ង់ហួសពេល' : 'Order Expired'}</h2>
             <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: 40 }}>{lang === 'kh' ? 'សុំទោស! រយៈពេលបង់ប្រាក់ ៥ នាទីត្រូវបានបញ្ជប់។ សូមសាកល្បងម្តងទៀត។' : 'Sorry! The 5-minute payment window has closed. Please try again.'}</p>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button onClick={handleRefreshQR} className="detail-btn-buy-luxury" disabled={isVerifying}>
                   {isVerifying ? '...' : (lang === 'kh' ? '🔄 ធ្វើឱ្យ QR ថ្មី' : '🔄 Refresh QR')}
                </button>
                <button onClick={onClose} className="back-btn-pill" style={{ opacity: 0.7 }}>{t('close')}</button>
             </div>
          </div>
        ) : orderStatus === 'paid' ? (
          showReceipt ? renderReceipt() : (
            <div className="order-card-luxury animate-up" style={{ padding: '60px 30px 40px', textAlign: 'center' }}>
               <SuccessCheckmark />
               <h2 style={{ fontSize: '28px', fontWeight: '950', color: 'var(--text-bold)', marginBottom: '12px' }}>{t('success_order')} ✨</h2>
               <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: 40 }}>{lang === 'kh' ? 'អរគុណសម្រាប់ការកម្ម៉ង់! យើងនឹងផ្ញើទំនិញក្នុងពេលឆាប់ៗ។' : 'Thank you for your order! We will deliver it soon.'}</p>
               
               <button onClick={() => setShowReceipt(true)} className="detail-btn-buy-luxury" style={{ marginBottom: 16 }}>
                  📄 {lang === 'kh' ? 'មើលវិក្កយបត្រ' : 'View Receipt'}
               </button>
               <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: '800' }}>{t('close')}</button>
            </div>
          )
        ) : (
          <div className="khqr-premium-box animate-up">
             <div className="khqr-terminal-header"></div>
             <div className="khqr-brand-tag">KHQR</div>
             
             <div style={{ textAlign: 'center' }}>
                <div className="order-id-lux" style={{ letterSpacing: 2 }}>MO MO BOUTIQUE</div>
                <div className="khqr-amount-lux">${parseFloat(localOrder.total).toFixed(2)}</div>

                {/* 📍 Quick Verification Info */}
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 20, background: 'var(--bg-soft)', display: 'inline-block', padding: '6px 16px', borderRadius: '100px' }}>
                   {localOrder.user_name} • {localOrder.phone}
                </div>

                <div className="qr-code-wrapper-lux">
                   {dynamicQr || paymentQrUrl ? (
                     <img src={dynamicQr || paymentQrUrl} alt="KHQR" onContextMenu={(e) => e.preventDefault()} />
                   ) : (
                     <div style={{ width: '220px', height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                        {timeLeft < 290 ? ( // 🛡️ Fallback: Show manual info if QR takes > 10s
                          <div className="animate-in" style={{ textAlign: 'center', padding: '15px' }}>
                            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏦</div>
                            <div style={{ fontSize: '12px', fontWeight: '950', color: 'var(--text-bold)', textTransform: 'uppercase', marginBottom: '8px' }}>Manual Payment</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg-soft)', padding: '10px', borderRadius: '12px', wordBreak: 'break-all' }}>
                              {paymentInfo || 'ABA: 000 000 000 (MOMO)'}
                            </div>
                            <div style={{ fontSize: '10px', marginTop: '10px', color: '#ef4444', fontWeight: 700 }}>{lang === 'kh' ? 'សាកល្បងបើកឡើងវិញដើម្បីទទួល QR' : 'Try reopening to refresh QR'}</div>
                          </div>
                        ) : (
                          <>
                            <div className="loader"></div>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: 1 }}>{lang === 'kh' ? 'កំពុងបង្កើត KHQR...' : 'Generating Secure KHQR...'}</span>
                          </>
                        )}
                     </div>
                   )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: timeLeft < 60 ? '#ef4444' : 'var(--text-muted)', fontWeight: 950, fontSize: 18, marginBottom: 8 }}>
                   <span style={{ opacity: 0.6 }}>⏳</span>
                   {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>

                {/* 🔍 Real-time Status Indicator with Network Awareness */}
                <div className="animate-pulse" style={{ fontSize: '10px', color: isOffline ? '#ef4444' : 'var(--primary-accent)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div className={isOffline ? "" : "dot-pulse"}></div>
                  {isOffline 
                    ? (lang === 'kh' ? 'កំពុងព្យាយាមភ្ជាប់ឡើងវិញ...' : 'Reconnecting to Secure Link...') 
                    : (lang === 'kh' ? 'កំពុងឆែកមើលការបង់ប្រាក់ពី Bakong...' : 'Watching for Bakong Payment...')}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                   <button onClick={onClose} className="back-btn-pill" style={{ width: '100%', height: 40, borderRadius: 16, opacity: 0.6, fontSize: 12 }}>{t('close')}</button>
                </div>
             </div>
          </div>
        )}
      </div>
      <style>{`
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        .dot-pulse { width: 6px; height: 6px; border-radius: 50%; background-color: var(--primary-accent); position: relative; }
        .dot-pulse::after { content: ''; position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: inherit; animation: dotPulse 1.5s ease-out infinite; }
        @keyframes dotPulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(3); opacity: 0; } }
      `}</style>
    </div>
  );
};

export default InvoiceModal;
