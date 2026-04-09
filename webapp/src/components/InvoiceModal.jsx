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
  const [isConfirming, setIsConfirming] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  if (!localOrder) return null;
  
  const isDraft = localOrder.id === 'DRAFT';
  const displayId = isDraft ? '...' : (localOrder.order_code || localOrder.id);
  const dbId = localOrder.id;
  const items = typeof localOrder.items === 'string' ? JSON.parse(localOrder.items) : localOrder.items;

  const orderStatus = localOrder.status;

  useEffect(() => {
    if (orderStatus === 'paid' || isExpired) return;
    if (timeLeft <= 0) {
       setIsExpired(true);
       return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [orderStatus, timeLeft, isExpired]);

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

  useEffect(() => {
    if (orderStatus === 'paid') return;
    let attempts = 0;
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      attempts++;
      if (attempts > 60) { clearInterval(interval); return; }

      const tgData = window.Telegram?.WebApp?.initData || '';
      fetch(`${BACKEND_URL}/api/orders/status/${localOrder.order_code}`, {
        headers: { 'X-TG-Data': tgData }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // Update local order to catch new status OR new qr_string
            setLocalOrder(data.order);
            if (data.status === 'paid') {
              if (onPaymentSuccess) onPaymentSuccess();
              clearInterval(interval);
            }
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [dbId, orderStatus, BACKEND_URL, onPaymentSuccess]);

  const renderReceipt = () => (
    <div className="receipt-luxury-paper animate-up">
       <div className="receipt-header-lux">
          <img src="/favicon.png" alt="MO MO" style={{ width: 48, height: 48, borderRadius: 12, marginBottom: 8 }} />
          <div className="receipt-tagline-lux">BOUTIQUE LUXURY</div>
       </div>

       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
             <div className="order-id-lux">{t('order_id')}</div>
             <div style={{ fontWeight: 950, fontSize: 13 }}>#{displayId}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
             <div className="order-id-lux">{t('order_date')}</div>
              <div style={{ fontWeight: 950, fontSize: 13 }}>
                {!isDraft && new Date(localOrder.created_at).toLocaleDateString(lang === 'kh' ? 'km-KH' : 'en-US')}
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

       <div className="receipt-divider-dash"></div>

       <div className="receipt-total-row">
          <span style={{ fontSize: 18, fontWeight: 950, color: 'var(--text-bold)' }}>{t('final_total')}</span>
          <span className="mega-price-primary" style={{ fontSize: 32 }}>${parseFloat(localOrder.total).toFixed(2)}</span>
        </div>

       {/* Verification QR */}
       <div style={{ textAlign: 'center', marginTop: 48, padding: '24px', background: 'var(--bg-soft)', borderRadius: '28px' }}>
          <img src={miniQrUrl} alt="" style={{ width: 100, height: 100, marginBottom: 12, borderRadius: 12, filter: 'contrast(1.1)' }} />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.5 }}>{lang === 'kh' ? 'ស្កេនដើម្បីផ្ទៀងផ្ទាត់' : 'Scan to Verify'}</div>
       </div>

       <div style={{ textAlign: 'center', marginTop: 32, display: 'flex', gap: 12 }}>
          <button 
             onClick={() => {
                const shareText = `🛍️ MO MO Boutique\n${t('order_id')}: #${String(displayId).substring(0, 8)}...\n${t('final_total')}: $${parseFloat(localOrder.total).toFixed(2)}`;
                switchInlineQuery(shareText, ['users', 'chats', 'groups', 'channels']);
             }}
             className="detail-btn-cart-luxury"
             style={{ flex: 2, height: 50, fontSize: 14 }}>
             📤 {lang === 'kh' ? 'ចែករំលែក' : 'Share'}
          </button>
          <button onClick={() => setShowReceipt(false)} className="back-btn-pill" style={{ flex: 1, height: 50, borderRadius: 16 }}>{t('close')}</button>
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
             <button onClick={onClose} className="detail-btn-buy-luxury" style={{ background: '#ef4444' }}>{t('close')}</button>
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

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: timeLeft < 60 ? '#ef4444' : 'var(--text-muted)', fontWeight: 950, fontSize: 18, marginBottom: 24 }}>
                   <span style={{ opacity: 0.6 }}>⏳</span>
                   {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                   <button onClick={onClose} className="back-btn-pill" style={{ width: '100%', height: 50, borderRadius: 16, opacity: 0.7 }}>{t('close')}</button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceModal;
