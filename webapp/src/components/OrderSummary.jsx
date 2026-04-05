import React from 'react';

const OrderSummary = ({ totalPrice }) => {
  return (
    <div className="summary-card">
      <div className="summary-row"><span>សរុប</span><span>${totalPrice.toFixed(2)}</span></div>
      <div className="summary-row"><span>បញ្ចុះតម្លៃ</span><span>$0.00</span></div>
      <div className="summary-row"><span>ថ្លៃដឹកជញ្ជូន</span><span>$0.00</span></div>
      <div className="summary-row bold"><span>ប្រាក់សរុប</span><span>${totalPrice.toFixed(2)}</span></div>
    </div>
  );
};

export default OrderSummary;
