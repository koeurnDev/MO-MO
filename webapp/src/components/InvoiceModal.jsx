import React from 'react';

const InvoiceModal = ({ order, onClose }) => {
  if (!order) return null;
  const items = JSON.parse(order.items);
  const date = new Date(order.created_at).toLocaleDateString('km-KH', { day: 'numeric', month: 'long', year: 'numeric' });
  const time = new Date(order.created_at).toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="invoice-paper" onClick={(e) => e.stopPropagation()}>
        <button className="close-invoice" onClick={onClose}>×</button>
        
        <header className="invoice-header">
          <div className="store-brand" style={{ fontSize: 24, fontWeight: 800, color: 'var(--admin-accent)', letterSpacing: '-1px', marginBottom: 4 }}>replicaaroma</div>
          <div className="invoice-title">វិក្កយបត្រ (INVOICE)</div>
          <div className="invoice-meta">
            <span>លេខលេខៈ #ORD-{order.id}</span>
            <span>កាលបរិច្ឆេទៈ {date} | {time}</span>
          </div>
        </header>

        <section className="invoice-section">
          <div className="section-title">ព័ត៌មានអតិថិជន (Customer Info)</div>
          <div className="customer-details">
            <p><strong>ឈ្មោះៈ</strong> {order.user_name}</p>
            <p><strong>លេខទូរស័ព្ទៈ</strong> {order.phone || 'N/A'}</p>
            <p><strong>អាស័យដ្ឋានៈ</strong> {order.address || 'N/A'}</p>
          </div>
        </section>

        <section className="invoice-section">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>ទំនិញ (Item)</th>
                <th style={{ textAlign: 'center' }}>ចំនួន</th>
                <th style={{ textAlign: 'right' }}>តម្លៃ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="invoice-footer">
          <div className="invoice-total-row">
            <span>សរុបរួម (Total):</span>
            <span className="grand-total">${order.total.toFixed(2)}</span>
          </div>
          <div className="thanks-msg">
            <p>អរគុណសម្រាប់ការគាំទ្រ! (Thank you for your support!)</p>
            <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 8 }}>replicaaroma . Official Store</p>
          </div>
        </footer>

        <button className="submit-btn-clean" style={{ marginTop: 24, height: 48, fontSize: 14 }} onClick={() => window.print()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          បោះពុម្ពវិក្កយបត្រ (Print Invoice)
        </button>
      </div>
    </div>
  );
};

export default InvoiceModal;
