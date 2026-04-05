import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

// 🎨 Success Animation
const SuccessCheckmark = () => (
  <div className="checkmark-wrapper">
    <svg className="checkmark-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
      <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
    </svg>
    <style>{`
      .checkmark-wrapper { width: 70px; height: 70px; margin: 0 auto 25px; position: relative; }
      .checkmark-circle { stroke-dasharray: 166; stroke-dashoffset: 166; stroke-width: 2; stroke-miterlimit: 10; stroke: #10b981; fill: none; animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards; }
      .checkmark-svg { width: 70px; height: 70px; border-radius: 50%; display: block; stroke-width: 2; stroke: #fff; stroke-miterlimit: 10; animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both; }
      .checkmark-check { transform-origin: 50% 50%; stroke-dasharray: 48; stroke-dashoffset: 48; animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards; }
      @keyframes stroke { 100% { stroke-dashoffset: 0; } }
      @keyframes scale { 0%, 100% { transform: none; } 50% { transform: scale3d(1.1, 1.1, 1); } }
      @keyframes fill { 100% { box-shadow: inset 0px 0px 0px 40px #10b981; } }
    `}</style>
  </div>
);

const InvoiceModal = ({ order, onClose, paymentQrUrl, paymentInfo, BACKEND_URL, onPaymentSuccess }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [orderStatus, setOrderStatus] = useState(order?.status || 'pending');
  const [timeLeft, setTimeLeft] = useState(300);
  const [showReceipt, setShowReceipt] = useState(false);
  const [miniQrUrl, setMiniQrUrl] = useState('');
  
  if (!order) return null;
  const orderId = order.id || order.orderId;
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

  useEffect(() => {
    if (orderStatus === 'paid') return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [orderStatus]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (order.qr_string) {
      QRCode.toDataURL(order.qr_string, { width: 600, margin: 1 })
      .then(url => setQrCodeUrl(url));
    }
  }, [order.qr_string]);

  useEffect(() => {
    if (showReceipt) {
      QRCode.toDataURL(`https://t.me/momo_boutique_bot?start=check_${orderId}`, { width: 100, margin: 1 })
      .then(url => setMiniQrUrl(url));
    }
  }, [showReceipt, orderId]);

  useEffect(() => {
    if (orderStatus === 'paid') {
      const timer = setTimeout(() => { if (!showReceipt) onClose(); }, 30000);
      return () => clearTimeout(timer);
    }
    const interval = setInterval(() => {
      fetch(`${BACKEND_URL}/api/orders/status/${orderId}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'paid') {
            setOrderStatus('paid');
            if (onPaymentSuccess) onPaymentSuccess();
          }
        });
    }, 3000);
    return () => clearInterval(interval);
  }, [orderId, orderStatus, showReceipt, BACKEND_URL, onClose]);

  const renderReceipt = () => (
    <div className="receipt-container" style={{ 
      background: 'white', 
      borderRadius: '24px', 
      padding: '40px 0', 
      boxShadow: '0 25px 60px rgba(0,0,0,0.1)',
      color: '#1e293b',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 🎟 Ticket Cut-outs */}
      <div style={{ position: 'absolute', top: '50%', left: '-12px', width: '24px', height: '24px', background: '#f1f5f9', borderRadius: '50%', transform: 'translateY(-50%)', zIndex: 2 }}></div>
      <div style={{ position: 'absolute', top: '50%', right: '-12px', width: '24px', height: '24px', background: '#f1f5f9', borderRadius: '50%', transform: 'translateY(-50%)', zIndex: 2 }}></div>

      <div style={{ padding: '0 30px' }}>
         <div style={{ textAlign: 'center', marginBottom: 35 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1e1b4b', marginBottom: 2, letterSpacing: '-1px' }}>MO MO</h1>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: 3 }}>BOUTIQUE LUXURY</div>
         </div>

         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25, borderBottom: '1px solid #f8fafc', paddingBottom: 15 }}>
            <div>
               <div style={{ color: '#94a3b8', fontWeight: 700, fontSize: 10, marginBottom: 3 }}>RECEIPT NO</div>
               <div style={{ fontWeight: 900, color: '#1e1b4b', fontSize: 14 }}>#MO-{orderId}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
               <div style={{ color: '#94a3b8', fontWeight: 700, fontSize: 10, marginBottom: 3 }}>DATE & TIME</div>
               <div style={{ fontWeight: 900, color: '#1e1b4b', fontSize: 11 }}>
                  {new Date().toLocaleDateString('en-GB')} <span style={{ opacity: 0.6 }}>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
               </div>
            </div>
         </div>

         <div style={{ marginBottom: 25 }}>
            <div style={{ color: '#94a3b8', fontWeight: 700, fontSize: 10, marginBottom: 12 }}>PURCHASE DETAILS</div>
            {items && items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                 <div style={{ fontWeight: 700, color: '#334155' }}>{item.name} <span style={{ color: '#94a3b8', fontSize: 12 }}>x{item.quantity}</span></div>
                 <div style={{ fontWeight: 800 }}>${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
              </div>
            ))}
         </div>

         {/* Perforated Divider */}
         <div style={{ borderTop: '2px dashed #f1f5f9', margin: '25px -30px', position: 'relative' }}></div>

         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#1e1b4b' }}>TOTAL PAID</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#ec4899' }}>${parseFloat(order.total).toFixed(2)}</span>
         </div>

         <div style={{ textAlign: 'center', marginTop: 15 }}>
            <span style={{ fontSize: 10, background: '#fdf2f8', color: '#ec4899', padding: '5px 15px', borderRadius: 10, fontWeight: 900, border: '1px solid #fce7f3' }}>
               ✅ VERIFIED BY BAKONG
            </span>
         </div>

         <div style={{ textAlign: 'center', marginTop: 40, padding: '20px', background: '#f8fafc', borderRadius: '18px' }}>
            <img src={miniQrUrl} alt="V" style={{ width: 80, height: 80, marginBottom: 10, borderRadius: 8 }} />
            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>ស្កេនដើម្បីផ្ទៀងផ្ទាត់</div>
         </div>

         <div style={{ textAlign: 'center', marginTop: 25, display: 'flex', gap: 10 }}>
            <button 
               onClick={() => {
                  const shareText = `🛍️ វិក្កយបត្រពី MO MO Boutique\nលេខកម្ម៉ង់: #MO-${orderId}\nសរុប: $${parseFloat(order.total).toFixed(2)}\nស្ថានភាព: ✅ បង់រួច`;
                  window.Telegram.WebApp.switchInlineQuery(shareText, ['users', 'chats', 'groups', 'channels']);
               }}
               style={{ 
                  flex: 1,
                  background: '#f8fafc', 
                  color: '#1e1b4b', 
                  border: '1px solid #e2e8f0', 
                  padding: '12px', 
                  borderRadius: 14, 
                  fontSize: 12, 
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
               }}>
               <h2 style={{ 
                margin: '5px 0 0', 
                fontSize: 22, 
                fontWeight: 900, 
                color: '#ff72a0',
                fontFamily: "'Bubblegum Sans', cursive"
              }}>
                MO MO Boutique
              </h2>
               📤 ចែករំលែក (Share)
            </button>
            <div style={{ flex: 1, fontSize: 9, color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
               Thank you for shopping! ✨
            </div>
         </div>
      </div>
      
      <button onClick={() => setShowReceipt(false)} style={{ position: 'absolute', top: 15, right: 15, border: 'none', background: '#f1f5f9', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontWeight: 900, color: '#1e1b4b' }}>×</button>
    </div>
  );

  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(230,234,242,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-up" style={{ width: '90%', maxWidth: '380px' }}>
        
        {orderStatus === 'paid' ? (
          showReceipt ? renderReceipt() : (
            <div className="luxury-success-card" style={{ background: 'white', borderRadius: '40px', padding: '60px 30px 40px', textAlign: 'center', boxShadow: '0 30px 100px rgba(16,185,129,0.15)' }}>
               <SuccessCheckmark />
               <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e1b4b', marginBottom: '10px' }}>បង់ប្រាក់ជោគជ័យ ✨</h2>
               <p style={{ fontSize: '14px', color: '#64748b', marginBottom: 35 }}>អរគុណបងសម្រាប់ការកម្ម៉ង់! យើងនឹងផ្ញើទំនិញជូនក្នុងពេលឆាប់ៗ។</p>
               
               <button 
                  onClick={() => setShowReceipt(true)}
                  style={{ background: '#1e1b4b', color: 'white', border: 'none', padding: '15px 30px', borderRadius: '18px', fontWeight: '800', width: '100%', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 10px 30px rgba(30,27,75,0.2)' }}>
                  📄 មើលវិក្កយបត្រ (Receipt)
               </button>

               <button onClick={onClose} style={{ marginTop: 20, background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>បិទផ្ទាំងនេះ</button>
            </div>
          )
        ) : (
          <>
            <div style={{ background: 'white', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 15px 40px rgba(0,0,0,0.08)', marginBottom: '15px' }}>
               <div style={{ background: '#e11d48', padding: '12px', textAlign: 'center' }}>
                  <span style={{ color: 'white', fontWeight: '900', fontSize: '20px', letterSpacing: '1px' }}>KHQR</span>
               </div>
               <div style={{ padding: '30px 25px' }}>
                  <div style={{ marginBottom: '25px' }}>
                     <div style={{ fontSize: '15px', color: '#64748b', fontWeight: '700' }}>MO MO Boutique</div>
                     <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e1b4b' }}>${parseFloat(order.total).toFixed(2)}</div>
                  </div>
                  <div style={{ borderTop: '2px dashed #e2e8f0', margin: '0 -25px 30px', position: 'relative' }}>
                     <div style={{ position: 'absolute', top: '-8px', left: '-8px', width: '16px', height: '16px', background: 'rgba(230,234,242,1)', borderRadius: '50%' }}></div>
                     <div style={{ position: 'absolute', top: '-8px', right: '-8px', width: '16px', height: '16px', background: 'rgba(230,234,242,1)', borderRadius: '50%' }}></div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                     <div style={{ width: '220px', height: '220px', margin: '0 auto 15px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={qrCodeUrl || paymentQrUrl} alt="KHQR" style={{ width: '100%', height: '100%' }} />
                     </div>
                  </div>
               </div>
            </div>

            <div style={{ background: 'white', borderRadius: '22px', padding: '20px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <div style={{ color: '#e11d48', fontWeight: '800', fontSize: '14px' }}>⏳ Time remaining:</div>
                  <div style={{ color: '#e11d48', fontWeight: '900', fontSize: '14px' }}>{formatTime(timeLeft)}</div>
               </div>
               <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '14px', padding: '12px 15px', fontSize: '11px', color: '#92400e', fontWeight: '700' }}>
                  ⚠️ Please keep this page open until confirmed.
               </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
               <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InvoiceModal;
