import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { useTelegram } from '../context/TelegramContext';
import { getVariantUnitMode, getCapacityLabel } from '../utils/variantUnitUtils';
import { isPaymentConfirmed } from '../utils/orderItemUtils';
import { formatFullAddress } from '../utils/deliveryUtils';

/**
 * 🎨 Success Animation (Luxury Checkmark)
 */
const SuccessCheckmark = () => (
  <div className="checkmark-wrapper">
    <svg className="checkmark-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
      <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
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
const InvoiceModal = ({ order, onClose, paymentQrUrl, paymentInfo, BACKEND_URL, onPaymentSuccess, onCartClear, t, lang }) => {
  const { switchInlineQuery, showAlert, HapticFeedback } = useTelegram();
  const [localOrder, setLocalOrder] = useState(order);
  const [timeLeft, setTimeLeft] = useState(300);
  const [showReceipt, setShowReceipt] = useState(false);
  const [miniQrUrl, setMiniQrUrl] = useState('');
  const [dynamicQr, setDynamicQr] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [qrError, setQrError] = useState('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [logoDataUrl, setLogoDataUrl] = useState('');
  const receiptRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || localOrder?.id === 'DRAFT') return;
    setIsUploadingReceipt(true);
    setUploadError('');
    const fd = new FormData();
    fd.append('image', file);
    try {
      const tgData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', headers: { 'X-TG-Data': tgData }, body: fd });
      const data = await res.json();
      if (!data.success || !data.url) {
        throw new Error(data.error || (lang === 'kh' ? 'មានបញ្ហាក្នុងការផ្ទុករូបភាព' : 'Upload failed'));
      }

      const receiptRes = await fetch(`${BACKEND_URL}/api/orders/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-TG-Data': tgData },
        body: JSON.stringify({ orderCode: localOrder.order_code, receiptUrl: data.url })
      });
      const receiptData = await receiptRes.json();
      if (!receiptData.success) {
        throw new Error(receiptData.error || (lang === 'kh' ? 'មិនអាចភ្ជាប់វិក្កយបត្រទៅការកម្ម៉ង់' : 'Could not link receipt to order'));
      }

      setReceiptUploaded(true);
      setLocalOrder(prev => ({ ...prev, receipt_url: data.url, ...(receiptData.order || {}) }));
      HapticFeedback?.notificationOccurred('success');
      showAlert(
        lang === 'kh'
          ? '✅ បានទទួលរូបបង់ប្រាក់! ក្រុមការងារកំពុងពិនិត្យ — សូមរង់ចាំការបញ្ជាក់។'
          : '✅ Payment proof received! Our team is reviewing — please wait for confirmation.'
      );
      if (typeof onCartClear === 'function') onCartClear();
    } catch (err) {
      console.error(err);
      setReceiptUploaded(false);
      setUploadError(err.message || (lang === 'kh' ? 'មានបញ្ហាបណ្តាញទាក់ទង' : 'Network Error'));
      setTimeout(() => setUploadError(''), 5000);
    } finally {
      setIsUploadingReceipt(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    const img = new Image();
    img.src = '/favicon.png';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const dataUrl = canvas.toDataURL('image/png');
          setLogoDataUrl(dataUrl);
        } catch (e) {
          console.warn("Failed to convert logo to data URL:", e);
        }
      }
    };
  }, []);

  // 🔄 Sync local order when parent prop updates (Essential for Draft -> Real transition)
  useEffect(() => {
    if (order) {
      setLocalOrder(order);
      if (order.receipt_url) setReceiptUploaded(true);
    }
  }, [order]);

  if (!localOrder) return null;

  const isDraft = localOrder.id === 'DRAFT';
  const displayId = isDraft ? '...' : (localOrder.order_code || String(localOrder.id));
  const dbId = localOrder.id;
  const items = React.useMemo(() => typeof localOrder.items === 'string' ? JSON.parse(localOrder.items) : localOrder.items, [localOrder.items]);

  const orderStatus = localOrder.status;

  // 🕒 SERVER-SYNCED TIMER: Direct sync with Server's expires_in
  useEffect(() => {
    if (isPaymentConfirmed(orderStatus) || isExpired || orderStatus === 'cancelled') return;

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
      try {
        QRCode.toDataURL(localOrder.qr_string, {
          width: 400,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' } // 🛡 Force High Contrast for Scanners
        })
          .then(url => setDynamicQr(url))
          .catch(err => {
            console.error("QR Generate Fail:", err);
            setQrError(err.message || 'QR Promise Error');
          });
      } catch (err) {
        console.error("QR Sync Error:", err);
        setQrError(err.message || 'QR Sync Error');
      }
    }
  }, [localOrder?.qr_string]);

  // 🚀 Auto-verify payment via Bakong (exponential backoff polling)
  useEffect(() => {
    if (isPaymentConfirmed(orderStatus) || isExpired || isDraft || receiptUploaded || !localOrder?.order_code) return;

    const currentDelay = attempts < 8 ? 3000 : attempts < 16 ? 5000 : 10000;

    const timeout = setTimeout(async () => {
      const tgData = window.Telegram?.WebApp?.initData || '';

      try {
        const res = await fetch(`${BACKEND_URL}/api/orders/status/${localOrder.order_code}`, {
          headers: { 'X-TG-Data': tgData }
        });
        const data = await res.json();

        setIsOffline(false);
        setAttempts(prev => prev + 1);

        if (data.success) {
          setLocalOrder(data.order);
          const paid = data.status === 'paid' || data.order?.status === 'paid';
          if (paid) {
            if (onPaymentSuccess) onPaymentSuccess();
            HapticFeedback?.notificationOccurred('success');
            setTimeout(() => setShowReceipt(true), 800);
          }
        }
      } catch (err) {
        console.warn('📡 Payment poll retry...', err.message);
        setIsOffline(true);
        setAttempts(prev => prev + 1);
      }
    }, currentDelay);

    return () => clearTimeout(timeout);
  }, [localOrder?.order_code, orderStatus, attempts, BACKEND_URL, onPaymentSuccess, isExpired, isDraft, receiptUploaded, HapticFeedback]);

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
        HapticFeedback?.impactOccurred('medium');
        if (data.order?.status === 'paid' && onPaymentSuccess) onPaymentSuccess();
      }
    } catch (err) {
      console.error("Refresh Fail:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const renderReceipt = () => (
    <div className="receipt-luxury-paper animate-up" style={{ padding: 0, overflow: 'hidden', background: '#ffffff', color: '#0f172a', borderRadius: '24px' }}>

      {/* ── Receipt Content to Save ── */}
      <div ref={receiptRef} style={{ background: '#ffffff', color: '#0f172a', padding: '0 0 14px 0' }}>
        {/* ── HEADER ── */}
        <div style={{ textAlign: 'center', padding: '20px 18px 14px', borderBottom: '1px dashed #e2e8f0' }}>
          <div style={{ display: 'inline-block', padding: 6, background: '#f8fafc', borderRadius: 16, marginBottom: 8 }}>
            <img src={logoDataUrl || "/favicon.png"} alt="MARUN MINI STORE" crossOrigin="anonymous" style={{ width: 44, height: 44, borderRadius: 10, display: 'block' }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', letterSpacing: 2 }}>MARUN MINI STORE</div>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginTop: 2 }}>
            {!isDraft && (() => {
              const d = new Date(localOrder.created_at);
              const dateStr = d.toLocaleDateString(lang === 'kh' ? 'km-KH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(',', '');
              const h = d.getHours();
              const m = String(d.getMinutes()).padStart(2, '0');
              const ampm = h >= 12 ? 'PM' : 'AM';
              const hour = h % 12 || 12;
              return `${dateStr}, ${hour}:${m} ${ampm}`;
            })()}
          </div>
        </div>

        <div style={{ padding: '14px 18px' }}>

          {/* ── TOTAL ── */}
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>{t('final_total')}</div>
            <div style={{ fontSize: 36, fontWeight: 950, color: '#d4af37', lineHeight: 1 }}>${parseFloat(localOrder.total).toFixed(2)}</div>
            <div style={{ marginTop: 6 }}>
              <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 10, fontWeight: 900, padding: '3px 12px', borderRadius: 100 }}>
                ✓ {lang === 'kh' ? 'ការបញ្ជាទិញបានបញ្ជាក់' : 'Confirmed'}
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #e2e8f0', margin: '10px 0' }} />

          {/* ── CUSTOMER INFO ── */}
          {[
            { label: lang === 'kh' ? 'អតិថិជន' : 'Customer', value: localOrder.user_name || 'Guest' },
            { label: lang === 'kh' ? 'ទូរស័ព្ទ' : 'Phone', value: localOrder.phone || '—' },
            { label: lang === 'kh' ? 'អាសយដ្ឋាន' : 'Address', value: formatFullAddress(localOrder.address, localOrder.province) || '—' },
            localOrder.delivery_company ? { label: lang === 'kh' ? 'ក្រុមហ៊ុនដឹក' : 'Courier', value: `🚚 ${localOrder.delivery_company}` } : null,
          ].filter(Boolean).map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, flexShrink: 0 }}>{row.label}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', textAlign: 'right', wordBreak: 'break-word', maxWidth: '62%' }}>{row.value}</span>
            </div>
          ))}

          <div style={{ borderTop: '1px dashed #e2e8f0', margin: '10px 0' }} />

          {/* ── ITEMS ── */}
          {items && items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingBottom: 6, borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', flex: 1 }}>
                {item.name} <span style={{ color: '#64748b', fontWeight: 700 }}>×{item.quantity}</span>
              </span>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          ))}

          {/* ── PRICE BOX ── */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '8px 12px', marginTop: 8, marginBottom: 10, border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{lang === 'kh' ? 'សរុបដើម' : 'Subtotal'}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>${parseFloat(localOrder.subtotal || localOrder.total).toFixed(2)}</span>
            </div>
            {parseFloat(localOrder.discount_amount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#ef4444' }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{lang === 'kh' ? 'បញ្ចុះតម្លៃ' : 'Discount'}</span>
                <span style={{ fontSize: 11, fontWeight: 800 }}>-${parseFloat(localOrder.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{lang === 'kh' ? 'ថ្លៃដឹក' : 'Delivery'}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981' }}>{parseFloat(localOrder.delivery_fee) === 0 ? (lang === 'kh' ? 'ឥតគិតថ្លៃ' : 'Free') : `$${parseFloat(localOrder.delivery_fee).toFixed(2)}`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 13, fontWeight: 950, color: '#0f172a' }}>{t('final_total')}</span>
              <span style={{ fontSize: 15, fontWeight: 950, color: '#d4af37' }}>${parseFloat(localOrder.total).toFixed(2)}</span>
            </div>
          </div>

          {/* ── REF NUMBER ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(212,175,55,0.06)', border: '1px dashed #d4af37', borderRadius: 8, padding: '7px 12px', marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{lang === 'kh' ? 'លេខកូដ' : 'Ref #'}</span>
            <span style={{ fontSize: 13, fontWeight: 950, color: '#d4af37', fontFamily: 'monospace', letterSpacing: 1.5 }}>
              {isDraft ? '...' : (localOrder.order_code || String(localOrder.id))}
            </span>
          </div>

          {/* ── QR CODE ── */}
          {miniQrUrl && (
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ display: 'inline-block', background: 'white', padding: 8, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <img src={miniQrUrl} alt="QR" style={{ width: 80, height: 80, display: 'block', borderRadius: 6 }} />
              </div>
              <div style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginTop: 5 }}>
                {lang === 'kh' ? 'ស្កេនដើម្បីផ្ទៀងផ្ទាត់' : 'Scan to Verify'}
              </div>
            </div>
          )}

          {/* ── END OF RECEIPT CONTENT ── */}
        </div>
      </div>

      {/* ── BUTTONS (Excluded from saved image) ── */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 18px 14px 18px', background: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
        <button
          onClick={async () => {
            if (!receiptRef.current) return;
            setIsSaving(true);
            try {
              const canvas = await html2canvas(receiptRef.current, { scale: 3, backgroundColor: '#ffffff', useCORS: true });

              // 1. Direct local download (Works on Desktop / standard browsers)
              const image = canvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.href = image;
              link.download = `Receipt_${displayId}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              // 2. Upload & Open Link (Allows Telegram Mobile App users to save to Phone Gallery + sends to chat)
              canvas.toBlob(async (blob) => {
                if (!blob) return;
                try {
                  const formData = new FormData();
                  formData.append('image', blob, `receipt_${displayId}.png`);
                  const tgData = window.Telegram?.WebApp?.initData || '';
                  const res = await fetch(`${BACKEND_URL}/api/upload?send_to_user=true`, {
                    method: 'POST',
                    headers: { 'X-TG-Data': tgData },
                    body: formData
                  });
                  const data = await res.json();
                  if (data.success && data.url) {
                    const msg = lang === 'kh'
                      ? 'វិក្កយបត្រត្រូវបានរក្សាទុក និងផ្ញើទៅកាន់សារផ្ទាល់ខ្លួនរបស់អ្នករួចរាល់ហើយ!'
                      : 'Invoice has been saved and sent to your personal Telegram chat!';
                    showAlert(msg);

                    if (window.Telegram?.WebApp?.openLink) {
                      window.Telegram.WebApp.openLink(data.url);
                    } else {
                      window.open(data.url, '_blank');
                    }
                  } else {
                    throw new Error(data.error || 'Server error');
                  }
                } catch (e) {
                  console.error("Upload fallback failed:", e);
                  const errorMsg = lang === 'kh'
                    ? 'ការរក្សាទុកវិក្កយបត្របានបរាជ័យ។ សូមព្យាយាមម្តងទៀត!'
                    : 'Failed to save receipt. Please try again!';
                  showAlert(errorMsg);
                }
              }, 'image/png');

              if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            } catch (err) {
              console.error("Failed to save receipt", err);
              const errorMsg = lang === 'kh'
                ? 'ការរក្សាទុកវិក្កយបត្របានបរាជ័យ។ សូមព្យាយាមម្តងទៀត!'
                : 'Failed to save receipt. Please try again!';
              showAlert(errorMsg);
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={isSaving}
          className="detail-btn-cart-luxury"
          style={{ flex: 1, height: 42, fontSize: 12, borderRadius: 10, opacity: isSaving ? 0.7 : 1, background: 'var(--primary-gradient)', color: '#ffffff', fontWeight: 800, border: 'none' }}>
          {isSaving ? '⌛...' : `📥 ${lang === 'kh' ? 'រក្សាទុក' : 'Save'}`}
        </button>
        <button
          onClick={onClose}
          className="detail-btn-cart-luxury"
          style={{ flex: 1, height: 42, borderRadius: 10, fontSize: 12, background: '#f1f5f9', color: '#0f172a', fontWeight: 800, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
          {lang === 'kh' ? 'បិទ' : 'Close'}
        </button>
      </div>

    </div>
  );

  return (
    <div className="modal-overlay" style={{ backgroundColor: 'var(--glass-bg)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px' }}>
        {isExpired ? (
          <div className="order-card-luxury animate-in" style={{ padding: '60px 30px 40px', textAlign: 'center', borderColor: '#fee2e2' }}>
            <div style={{ fontSize: '70px', marginBottom: '25px' }}>⏳</div>
            <h2 className="invoice-expired-title">{lang === 'kh' ? 'ការកុម្ម៉ង់ហួសពេល' : 'Order Expired'}</h2>
            <p className="invoice-expired-text">{lang === 'kh' ? 'សុំទោស! រយៈពេលបង់ប្រាក់ ៥ នាទីត្រូវបានបញ្ជប់។ សូមសាកល្បងម្តងទៀត។' : 'Sorry! The 5-minute payment window has closed. Please try again.'}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={handleRefreshQR} className="detail-btn-buy-luxury" disabled={isVerifying}>
                {isVerifying ? '...' : (lang === 'kh' ? '🔄 ធ្វើឱ្យ QR ថ្មី' : '🔄 Refresh QR')}
              </button>
              <button onClick={onClose} className="back-btn-pill" style={{ opacity: 0.7 }}>{lang === 'kh' ? 'បិទ' : 'Close'}</button>
            </div>
          </div>
        ) : orderStatus === 'cancelled' ? (
          <div className="order-card-luxury animate-in" style={{ padding: '50px 30px 40px', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>❌</div>
            <h2 style={{ fontSize: '22px', fontWeight: '950', color: 'var(--text-bold)', marginBottom: '10px' }}>
              {lang === 'kh' ? 'ការកម្ម៉ង់ត្រូវបានបោះបង់' : 'Order Cancelled'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.5 }}>
              {lang === 'kh' ? 'ការកម្ម៉ង់នេះមិនបានបញ្ជាក់ការបង់ប្រាក់ ដូច្នេះមិនមានវិក្កយបត្រ។' : 'Payment was not confirmed, so no receipt is available.'}
            </p>
            <button onClick={onClose} className="back-btn-pill">{lang === 'kh' ? 'បិទ' : 'Close'}</button>
          </div>
        ) : isPaymentConfirmed(orderStatus) ? (
          renderReceipt()
        ) : (
          <div className="khqr-premium-box animate-up">
            <div className="khqr-terminal-header">
              <div className="khqr-brand-tag">
                <span style={{ background: '#fff', color: '#ea1c24', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 950 }}>KHQR</span>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="khqr-body">
              <div className="khqr-shop-name order-id-lux">MARUN MINI STORE</div>
              <div className="khqr-amount-lux">${parseFloat(localOrder.total).toFixed(2)}</div>

              <div className="khqr-meta-pill">
                {localOrder.user_name} • {localOrder.phone}
              </div>

              {isDraft ? (
                <div className="khqr-preparing-wrap">
                  <div style={{ fontSize: '36px', marginBottom: '12px', animation: 'spin 2s linear infinite' }}>⏳</div>
                  <div className="khqr-preparing-title">{lang === 'kh' ? 'កំពុងរៀបចំការកម្ម៉ង់...' : 'Preparing Order...'}</div>
                  <div className="khqr-preparing-sub">{lang === 'kh' ? 'សូមរង់ចាំបន្តិច ពេលកំពុងភ្ជាប់ទៅកាន់ប្រព័ន្ធ...' : 'Please wait while we connect to the system...'}</div>
                </div>
              ) : (
                <>
                  {!receiptUploaded ? (
                    <>
                      <div className="qr-code-wrapper-lux">
                        {dynamicQr ? (
                          <img src={dynamicQr} alt="KHQR" onContextMenu={(e) => e.preventDefault()} />
                        ) : paymentQrUrl ? (
                          <img src={paymentQrUrl} alt="KHQR" onContextMenu={(e) => e.preventDefault()} />
                        ) : (
                          <div className="khqr-payment-details">
                            <div className="animate-in" style={{ textAlign: 'center', padding: '10px' }}>
                              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏦</div>
                              <div className="khqr-payment-details-title">{lang === 'kh' ? 'ព័ត៌មានបង់ប្រាក់' : 'Payment Details'}</div>
                              <div className="khqr-payment-details-body">
                                {paymentInfo || 'ABA KHQR'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={`khqr-timer${timeLeft < 60 ? ' khqr-timer--urgent' : ''}`}>
                        <span style={{ opacity: 0.6 }}>⏳</span>
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                      </div>
                    </>
                  ) : (
                    <div className="khqr-summary-box animate-in">
                      <div className="khqr-summary-title">
                        {lang === 'kh' ? '🛍️ សេចក្តីសង្ខេបការកម្ម៉ង់' : '🛍️ Order Summary'}
                      </div>
                      <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                        {items?.map((item, idx) => (
                          <div key={idx} className="khqr-summary-item">
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span>{item.name}</span>
                              <span className="khqr-summary-item-meta">
                                {item.selectedSize ? `${getCapacityLabel(lang, getVariantUnitMode({ category: item.category, productName: item.name, variantSizes: [item.selectedSize] }))}: ${item.selectedSize} ` : ''}
                                {item.selectedColor ? (`${lang === 'kh' ? 'ពណ៌' : 'Color'}: ${item.selectedColor} `) : ''}
                                Qty: {item.quantity}
                              </span>
                            </span>
                            <span style={{ fontWeight: 800 }}>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="khqr-summary-total">
                        <span>{lang === 'kh' ? 'សរុប' : 'Total'}</span>
                        <span>${localOrder.total?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  )}

                  {!receiptUploaded && !isDraft && (
                    <div className="khqr-verify-options">
                      <p className="khqr-verify-hint">
                        {lang === 'kh' ? '① ស្កេន QR រួចបង់ប្រាក់' : '① Scan QR and pay'}
                      </p>
                      <label className="khqr-upload-btn">
                        {isUploadingReceipt
                          ? (lang === 'kh' ? '⌛ កំពុងផ្ទុក...' : '⌛ Uploading...')
                          : (lang === 'kh' ? '📥 ដាក់ Screenshot បង់ប្រាក់' : '📥 Upload payment screenshot')}
                        <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isUploadingReceipt} onChange={handleReceiptUpload} />
                      </label>
                    </div>
                  )}

                  {receiptUploaded && (
                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 800, marginBottom: 14, textAlign: 'center', lineHeight: 1.4, background: 'rgba(16, 185, 129, 0.1)', padding: '10px 14px', borderRadius: 12 }}>
                      {lang === 'kh' ? '✅ ទទួល Screenshot រួច! ក្រុមការងារកំពុងពិនិត្យ — សូមរង់ចាំការបញ្ជាក់។' : '✅ Screenshot received! Our team is reviewing — please wait for confirmation.'}
                    </div>
                  )}

                  <div className="khqr-actions">
                    {uploadError && (
                      <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 900, textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: 8, borderRadius: 10 }}>
                        ⚠️ {uploadError}
                      </div>
                    )}
                    <button onClick={onClose} className="khqr-close-btn">{lang === 'kh' ? 'បិទ' : 'Close'}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceModal;
