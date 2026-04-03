import React from 'react';

const PillFooter = ({ view, setView, totalPrice, onPay }) => {
  return (
    <footer className="pill-footer-wrapper">
      <div className="total-group">
        <div className="total-label">{view === 'home' ? 'ទំនិញក្នុងកន្ត្រក' : 'ប្រាក់សរុប'}</div>
        <div className="total-amount">${totalPrice.toFixed(2)}</div>
      </div>
      <button className="pay-btn-modern" onClick={view === 'home' ? () => setView('checkout') : onPay}>
        {view === 'home' ? 'មើលកន្ត្រកទំនិញ' : 'ទូទាត់ប្រាក់'}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
      </button>
    </footer>
  );
};

export default PillFooter;
