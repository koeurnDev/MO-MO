import React from 'react';

const DeliveryForm = ({ user, formData, setFormData }) => {
  return (
    <div className="delivery-form">
      <h3 style={{ margin: '0 0 10px 0', fontSize: 16 }}>ព័ត៌មានអំពីការដឹកជញ្ជូន</h3>
      <span className="form-label-kh">ឈ្មោះ</span>
      <input type="text" className="form-input-modern" defaultValue={user?.first_name || ''} />
      <span className="form-label-kh">លេខទូរស័ព្ទ*</span>
      <input 
        type="tel" 
        className="form-input-modern" 
        placeholder="បញ្ចូលលេខទូរស័ព្ទ" 
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
      />
      <span className="form-label-kh">អាស័យដ្ឋាន*</span>
      <textarea 
        className="form-input-modern" 
        rows="2" 
        placeholder="បញ្ចូលអាស័យដ្ឋានដឹកជញ្ជូន"
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
      ></textarea>
    </div>
  );
};

export default DeliveryForm;
