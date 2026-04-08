import React, { useState } from 'react';

const DeliveryForm = ({ formData, setFormData, onPhoneChange, t, lang, validationErrors = {} }) => {
  const [imgErrors, setImgErrors] = useState({ jt: false, vet: false });
  const provinces = [
    'Phnom Penh', 'Siem Reap', 'Preah Sihanouk', 'Battambang', 'Kampot', 
    'Kep', 'Kandal', 'Kampong Cham', 'Kampong Chhnang', 'Kampong Speu', 
    'Kampong Thom', 'Koh Kong', 'Kratie', 'Mondulkiri', 'Oddar Meanchey', 
    'Pailin', 'Preah Vihear', 'Prey Veng', 'Pursat', 'Ratanakiri', 
    'Stung Treng', 'Svay Rieng', 'Takeo', 'Tboung Khmum'
  ];

  return (
    <div className="delivery-form-container animate-in">
      {/* 👤 Buyer Information Section */}
      <div className="form-section-luxury">
        <h3 className="section-title-clean">{t('buyer_info')}</h3>
        
        <div className="input-group-luxury">
          <label className="input-label-luxury">
            {t('name_label')} <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div className="input-with-icon">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
             <input 
               type="text" 
               className="input-glass" 
               placeholder={lang === 'kh' ? 'ឧទាហរណ៍: John Doe' : 'Ex: John Doe'} 
               value={formData.name}
               onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
             />
          </div>
        </div>

        <div className="input-group-luxury" style={{ marginTop: 15 }}>
          <label className="input-label-luxury">
             {t('phone_label')} <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div className="input-with-icon">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.81 12.81 0 0 0 .62 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.62A2 2 0 0 1 22 16.92z"></path></svg>
             <input 
               type="tel" 
               className={`input-glass ${validationErrors.phone ? 'input-error-shake' : ''}`} 
               placeholder={lang === 'kh' ? 'ឧទាហរណ៍: 012 345 678' : 'Ex: 012 345 678'} 
               value={formData.phone}
               onChange={(e) => onPhoneChange(e.target.value)}
             />
          </div>
        </div>
      </div>

      {/* 🚚 Delivery Information Section */}
      <div className="form-section-luxury" style={{ marginTop: 30 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginBottom: 20 }}>
           <h3 className="section-title-clean" style={{ margin: 0 }}>
              {lang === 'kh' ? 'ដឹកជញ្ជូនតាម (Ship Via)' : 'ដឹកជញ្ជូនតាម (Ship Via)'}
           </h3>
           
           <div className="carrier-selection-grid">
              <div 
                className={`carrier-option-card ${formData.deliveryCompany === 'j&t' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, deliveryCompany: 'j&t' }))}
              >
                 <div className="carrier-check">{formData.deliveryCompany === 'j&t' ? '✓' : ''}</div>
                 {!imgErrors.jt ? (
                    <img 
                      src="/jt.png" 
                      alt="J&T" 
                      className="carrier-logo-img" 
                      onError={() => setImgErrors(prev => ({ ...prev, jt: true }))}
                    />
                 ) : (
                    <div className="jt-logo-fallback">
                       <span style={{ color: '#ff2c00', fontWeight: 900 }}>J</span>
                       <span style={{ color: 'var(--text-bold)', fontWeight: 900 }}>&</span>
                       <span style={{ color: '#ff2c00', fontWeight: 900 }}>T</span>
                    </div>
                 )}
              </div>

              <div 
                className={`carrier-option-card ${formData.deliveryCompany === 'vet' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, deliveryCompany: 'vet' }))}
              >
                 <div className="carrier-check">{formData.deliveryCompany === 'vet' ? '✓' : ''}</div>
                 {!imgErrors.vet ? (
                    <img 
                      src="/vet.png" 
                      alt="VET" 
                      className="carrier-logo-img" 
                      onError={() => setImgErrors(prev => ({ ...prev, vet: true }))}
                    />
                 ) : (
                    <div className="vet-logo-fallback">
                       <span className="vet-fallback-v">V</span>
                       <span className="vet-fallback-e">E</span>
                       <span className="vet-fallback-t">T</span>
                    </div>
                 )}
              </div>
           </div>
        </div>

        <div className="input-group-luxury">
          <label className="input-label-luxury">
             {t('address_placeholder')} <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div className="input-with-icon">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
             <input 
               type="text" 
               className="input-glass" 
               placeholder={lang === 'kh' ? 'ឧទាហរណ៍: ទួលទំពូង' : 'Ex: Toul Tompung'} 
               value={formData.address}
               onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
             />
          </div>
        </div>

        <div className="input-group-luxury" style={{ marginTop: 15 }}>
          <label className="input-label-luxury">
             {t('province_label')} <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div className="input-with-icon">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="9" r="3"/></svg>
             <select 
               className="input-glass select-luxury"
               value={formData.province}
               onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
             >
               {provinces.map(p => <option key={p} value={p}>{p}</option>)}
             </select>
          </div>
        </div>

        <div className="input-group-luxury" style={{ marginTop: 15 }}>
          <label className="input-label-luxury">
             {t('note_label')}
          </label>
          <textarea 
            className="input-glass" 
            style={{ height: 80, paddingTop: 12, color: 'var(--text-main)', background: 'var(--bg-surface)' }}
            placeholder="..." 
            value={formData.note}
            onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
          />
        </div>
      </div>
    </div>
  );
};

export default DeliveryForm;
