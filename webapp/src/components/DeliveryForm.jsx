import React from 'react';

const DeliveryForm = ({ formData, setFormData }) => {
  return (
    <div className="delivery-form-container animate-in">
      <div className="section-header" style={{ padding: '0 0 10px' }}>
        <h3 style={{ fontSize: 18, fontWeight: 800 }}>ព័ត៌មានដឹកជញ្ជូន 🚚</h3>
      </div>
      
      <input 
        type="tel" 
        className="input-glass" 
        placeholder="លេខទូរស័ព្ទ" 
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
      />
      
      <textarea 
        className="input-glass" 
        style={{ height: 100, paddingTop: 15 }}
        placeholder="អាស័យដ្ឋានបច្ចុប្បន្ន" 
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
      />
    </div>
  );
};

export default DeliveryForm;
