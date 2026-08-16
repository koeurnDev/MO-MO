import React, { useEffect, useMemo, useRef } from 'react';
import DarkSelect from './DarkSelect';
import { useUser } from '../../context/UserContext';
import { getDeliveryRuleSummary, isAlwaysFreeDelivery, parseDeliverySetting } from '../../utils/deliveryUtils';
import { getBannerDesignSize, getBannerSafeZoneHint, getBannerDisplayNote, getOptimizedBannerUrl } from '../../utils/bannerUtils';
import {
  parseBannerEntries,
  parseBannerTarget,
  buildBannerTarget,
  resolveCategoryLinkValue,
  getCategoryOptionValue
} from '../../utils/bannerLinkUtils';
import { DEMO_SOCIAL_LINKS, normalizeSocialLink } from '../../utils/socialLinkUtils';

const AdminSettingsTab = React.memo(({
  shopStatus, showConfirm, setShopStatus, updateSettingValue,
  deliveryFee, setDeliveryFee, deliveryThreshold, setDeliveryThreshold,
  promoBannerUrl, removeBanner, handleBannerUpload, updateBannerProduct, products, categories,
  shopLogoUrl, handleLogoUpload,
  paymentQrUrl, handleQrUpload, paymentInfo, setPaymentInfo, bakongAccountId, setBakongAccountId,
  receiptShopName, setReceiptShopName,
  receiptSubtitle, setReceiptSubtitle,
  receiptNote, setReceiptNote,
  socialFb, setSocialFb,
  socialTg, setSocialTg,
  socialIg, setSocialIg,
  socialTt, setSocialTt,
  socialEmail, setSocialEmail,
  socialWa, setSocialWa,
  shopPhone, setShopPhone,
  shopAddress, setShopAddress,
  shopHours, setShopHours,
  settingsReady = false,
}) => {
  const { t, lang } = useUser();

  const feeIsZero = isAlwaysFreeDelivery(deliveryFee);
  const deliveryRuleSummary = useMemo(
    () => getDeliveryRuleSummary(deliveryFee, deliveryThreshold, lang),
    [deliveryFee, deliveryThreshold, lang]
  );

  const persistSocialField = (key, type, rawValue, setter) => {
    const normalized = normalizeSocialLink(type, rawValue);
    setter(normalized);
    updateSettingValue(key, normalized);
  };

  const persistDeliveryField = (key, rawValue, fallback) => {
    const normalized = String(parseDeliverySetting(rawValue, fallback));
    if (key === 'delivery_fee') setDeliveryFee(normalized);
    else setDeliveryThreshold(normalized);
    updateSettingValue(key, normalized);
  };

  const demoSeededRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV || !settingsReady || demoSeededRef.current) return;
    const hasAny = [socialFb, socialTg, socialIg, socialTt, socialEmail, shopPhone].some(Boolean);
    if (hasAny) return;

    demoSeededRef.current = true;
    const demos = [
      { key: 'social_fb', type: 'url', value: DEMO_SOCIAL_LINKS.social_fb, setter: setSocialFb },
      { key: 'social_tg', type: 'telegram', value: DEMO_SOCIAL_LINKS.social_tg, setter: setSocialTg },
      { key: 'social_ig', type: 'url', value: DEMO_SOCIAL_LINKS.social_ig, setter: setSocialIg },
      { key: 'social_tt', type: 'url', value: DEMO_SOCIAL_LINKS.social_tt, setter: setSocialTt },
      { key: 'social_email', type: 'email', value: DEMO_SOCIAL_LINKS.social_email, setter: setSocialEmail },
      { key: 'social_wa', type: 'whatsapp', value: DEMO_SOCIAL_LINKS.social_wa, setter: setSocialWa },
    ];
    demos.forEach(({ key, type, value, setter }) => {
      const normalized = normalizeSocialLink(type, value);
      setter(normalized);
      updateSettingValue(key, normalized);
    });
    setShopPhone(DEMO_SOCIAL_LINKS.shop_phone);
    setShopAddress(DEMO_SOCIAL_LINKS.shop_address);
    setShopHours(DEMO_SOCIAL_LINKS.shop_hours);
    updateSettingValue('shop_phone', DEMO_SOCIAL_LINKS.shop_phone);
    updateSettingValue('shop_address', DEMO_SOCIAL_LINKS.shop_address);
    updateSettingValue('shop_hours', DEMO_SOCIAL_LINKS.shop_hours);
  }, [settingsReady, socialFb, socialTg, socialIg, socialTt, socialEmail, shopPhone, setSocialFb, setSocialTg, setSocialIg, setSocialTt, setSocialEmail, setSocialWa, setShopPhone, setShopAddress, setShopHours, updateSettingValue]);

  const SHOP_STATUS_OPTIONS = useMemo(() => [
    { value: 'open', label: `🟢 ${t('admin_open')}` },
    { value: 'closed', label: `🔴 ${t('admin_closed')}` },
  ], [t]);

  return (
  <div className="tab-pane-animate">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Shop Status */}
      <div className="glass-card-luxury" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', padding: '20px', zIndex: 10 }}>
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>🏪 {t('admin_shop_status')}</div>
          <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>{t('admin_shop_status_desc')}</div>
        </div>
        <div style={{ width: '100%', maxWidth: 180, flex: '1 1 120px' }}>
          <DarkSelect
            value={shopStatus}
            onChange={async val => {
              showConfirm(
                val === 'open' ? t('admin_confirm_open') : t('admin_confirm_closed'),
                () => { setShopStatus(val); updateSettingValue('shop_status', val); },
                '🏪'
              );
            }}
            options={SHOP_STATUS_OPTIONS}
          />
        </div>
      </div>

      {/* Delivery Settings */}
      <div className="glass-card-luxury" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#3b82f6' }}>🚚</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 950, fontSize: 16, color: 'var(--text-bold)' }}>{t('delivery_label') || 'សេវាដឹកជញ្ជូន'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t('admin_delivery_desc') || 'កំណត់តម្លៃដឹក និងលក្ខខណ្ឌដឹកហ្វ្រី'}</div>
          </div>
        </div>

        <div className="admin-responsive-grid" style={{ gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 900, marginBottom: 8, color: 'var(--text-bold)' }}>{t('admin_delivery_fee') || 'ថ្លៃសេវាដឹកជញ្ជូន'}</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: 14, fontSize: 15, fontWeight: 900, color: 'var(--text-muted)', zIndex: 2 }}>$</span>
              <input 
                className="input-glass-admin" 
                type="text"
                inputMode="decimal"
                style={{ paddingLeft: 38, width: '100%', fontSize: 14, fontWeight: 800 }} 
                placeholder="1.50" 
                value={deliveryFee} 
                onChange={e => setDeliveryFee(e.target.value.replace(/[^0-9.]/g, ''))}
                onBlur={() => persistDeliveryField('delivery_fee', deliveryFee, 0)}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, opacity: 0.8 }}>
              {lang === 'kh'
                ? 'ឧទាហរណ៍៖ 1.50 · ដាក់ 0 ប្រសិនបើដឹកហ្វ្រីគ្រប់ order'
                : 'Example: 1.50 · Use 0 for free delivery on every order'}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 900, marginBottom: 8, color: 'var(--text-bold)' }}>{t('admin_free_delivery_threshold') || 'ដឹកហ្វ្រីចាប់ពី'}</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: 14, fontSize: 15, fontWeight: 900, color: 'var(--text-muted)', zIndex: 2 }}>$</span>
              <input 
                className="input-glass-admin" 
                type="text"
                inputMode="decimal"
                style={{ paddingLeft: 38, width: '100%', fontSize: 14, fontWeight: 800 }} 
                placeholder="50.00" 
                value={deliveryThreshold} 
                onChange={e => setDeliveryThreshold(e.target.value.replace(/[^0-9.]/g, ''))}
                onBlur={() => persistDeliveryField('delivery_threshold', deliveryThreshold, 50)}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, opacity: 0.8 }}>
              {feeIsZero
                ? (lang === 'kh'
                  ? 'ដឹកហ្វ្រីគ្រប់ order រួចហើយ · threshold នឹងដំណើរការពេលដាក់ថ្លៃដឹក > 0'
                  : 'Delivery is free for every order · threshold applies once fee is above 0')
                : (lang === 'kh'
                  ? `ទិញ $${parseDeliverySetting(deliveryThreshold, 50).toFixed(0)}+ ដឹកហ្វ្រី · ក្រោមនេះគិត $${parseDeliverySetting(deliveryFee, 1.5).toFixed(2)}`
                  : `Free delivery on $${parseDeliverySetting(deliveryThreshold, 50).toFixed(0)}+ · Below that, charge $${parseDeliverySetting(deliveryFee, 1.5).toFixed(2)}`)}
            </div>
          </div>
        </div>

        <div style={{
          padding: '12px 14px',
          borderRadius: 12,
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.18)',
          fontSize: 12,
          fontWeight: 800,
          color: '#10b981',
          lineHeight: 1.5
        }}>
          ✓ {deliveryRuleSummary}
        </div>
      </div>

      {/* Banners + Logo */}
      <div className="admin-responsive-grid" style={{ gap: 15 }}>
        <div className="glass-card-luxury" style={{ padding: 20, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontWeight: 950, marginBottom: 8, fontSize: 14 }}>🖼️ {t('admin_shop_banner')}</div>
          <p className="admin-banner-size-hint admin-banner-size-hint--primary">{getBannerDesignSize(lang)}</p>
          <p className="admin-banner-size-hint">{getBannerSafeZoneHint(lang)}</p>
          <p className="admin-banner-preview-note">{getBannerDisplayNote(lang)}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            {parseBannerEntries(promoBannerUrl).map((entry, idx) => {
              const { url } = entry;
              const { linkType, linkValue } = parseBannerTarget(entry.rawTarget || entry.targetStr);
              const productValue = linkType === 'prod' ? linkValue : '';
              const categoryValue = linkType === 'cat' ? resolveCategoryLinkValue(categories, linkValue) : '';
              const externalValue = linkType === 'ext' ? linkValue : '';

              return (
              <div key={`${url}-${idx}`} className="admin-banner-item">
                <div className="admin-banner-thumb">
                  <img src={getOptimizedBannerUrl(url)} alt="" crossOrigin="anonymous" />
                  <span className="admin-banner-aspect-badge">16:9</span>
                  <button type="button" className="remove-thumb-btn" onClick={() => removeBanner(idx)}>✕</button>
                </div>

                <select
                  value={linkType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    if (!newType) updateBannerProduct(idx, '');
                    else if (newType === 'prod') updateBannerProduct(idx, 'prod:');
                    else if (newType === 'cat') updateBannerProduct(idx, 'cat:');
                    else if (newType === 'ext') updateBannerProduct(idx, 'ext:');
                  }}
                  style={{ width: '100%', padding: '4px', fontSize: '10px', background: 'var(--bg-soft)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}
                >
                  <option value="">- គ្មាន Link -</option>
                  <option value="prod">ទំនិញ</option>
                  <option value="cat">ប្រភេទទំនិញ</option>
                  <option value="ext">Link ខាងក្រៅ</option>
                </select>

                {linkType === 'prod' && (
                  <select
                    value={productValue}
                    onChange={(e) => updateBannerProduct(idx, buildBannerTarget('prod', e.target.value))}
                    style={{ width: '100%', padding: '4px', fontSize: '10px', background: 'var(--bg-soft)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}
                  >
                    <option value="">{lang === 'kh' ? '— ជ្រើសរើសទំនិញ —' : '— Select product —'}</option>
                    {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                {linkType === 'cat' && (
                  <select
                    value={categoryValue}
                    onChange={(e) => updateBannerProduct(idx, buildBannerTarget('cat', e.target.value))}
                    style={{ width: '100%', padding: '4px', fontSize: '10px', background: 'var(--bg-soft)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}
                  >
                    <option value="">{lang === 'kh' ? '— ជ្រើសរើសប្រភេទ —' : '— Select category —'}</option>
                    {categories?.map(c => (
                      <option key={c.id} value={getCategoryOptionValue(c)}>{c.name}</option>
                    ))}
                  </select>
                )}
                {linkType === 'ext' && (
                  <input
                    type="url"
                    value={externalValue}
                    onChange={(e) => updateBannerProduct(idx, buildBannerTarget('ext', e.target.value.trim()))}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '4px', fontSize: '10px', background: 'var(--bg-soft)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                )}
              </div>
            )})}
            <label className="upload-zone-luxury admin-banner-upload">
              <div className="upload-label-content" style={{ minHeight: 'auto', padding: 10 }}>
                <div style={{ fontSize: 22 }}>🌄</div>
                <div style={{ fontSize: 11, fontWeight: 900 }}>{t('admin_add_banner')}</div>
                <div className="admin-banner-upload-size">1200×675</div>
              </div>
              <input type="file" accept="image/*" onChange={async e => { 
                const file = e.target.files?.[0]; 
                if (file) {
                  await handleBannerUpload(file); 
                }
                e.target.value = ''; 
              }} />
            </label>
          </div>
        </div>
        <div className="glass-card-luxury" style={{ padding: 20, minWidth: 0 }}>
          <div style={{ fontWeight: 950, marginBottom: 15, fontSize: 14 }}>🏷️ {t('admin_shop_logo')}</div>
          <label className="upload-zone-luxury" style={{ height: 110 }}>
            {shopLogoUrl ? (
              <img src={shopLogoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" crossOrigin="anonymous" />
            ) : (
              <div className="upload-label-content">
                <div style={{ fontSize: 22 }}>🏷️</div>
                <div style={{ fontSize: 11, fontWeight: 900 }}>{t('admin_change_logo')}</div>
              </div>
            )}
            <input type="file" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; if (file) handleLogoUpload(file); }} />
          </label>
        </div>
      </div>

      {/* Payment */}
      <div className="glass-card-luxury">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 24 }}>💳</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>ព័ត៌មានបង់ប្រាក់</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>កំណត់រូប QR និងលេខគណនីធនាគារ</div>
          </div>
        </div>
        <div className="admin-responsive-grid" style={{ gap: 16, marginBottom: 15 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>លេខសម្គាល់គណនីបាគង (Bakong KHQR ID)</label>
            <input
              type="text"
              className="input-glass-admin"
              style={{ fontSize: 13, height: 44, padding: '0 15px' }}
              value={bakongAccountId}
              onChange={(e) => setBakongAccountId(e.target.value)}
              onBlur={() => updateSettingValue('bakong_account_id', bakongAccountId)}
              placeholder="ឧ. seab_koeurn@bkrt"
            />
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 5 }}>ប្រើសម្រាប់បង្កើត KHQR ស្វ័យប្រវត្តិ</div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>រូបភាព QR (KHQR)</label>
            <label className="upload-zone-luxury" style={{ height: 120 }}>
              {paymentQrUrl ? (
                <img src={paymentQrUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" crossOrigin="anonymous" />
              ) : (
                <div className="upload-label-content">
                  <div style={{ fontSize: 22 }}>📸</div>
                  <div style={{ fontSize: 10, fontWeight: 900 }}>ដាក់រូប QR</div>
                </div>
              )}
              <input type="file" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; if (file) handleQrUpload(file); }} />
            </label>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>ព័ត៌មានគណនី</label>
            <textarea
              className="input-glass-admin"
              style={{ height: 120, fontSize: 12 }}
              placeholder="ឧទាហរណ៍៖ ABA: 000 111 222 (NAME)"
              value={paymentInfo}
              onChange={e => setPaymentInfo(e.target.value)}
              onBlur={e => updateSettingValue('payment_info', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Receipt */}
      <div className="glass-card-luxury">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 24 }}>🖨️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>ព័ត៌មានវិក្កយបត្រ</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>កំណត់ឈ្មោះ និងអក្សររត់ពីក្រោមលើវិក្កយបត្រ</div>
          </div>
        </div>
        <div className="admin-responsive-grid" style={{ gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>ឈ្មោះហាង</label>
            <input
              className="input-glass-admin"
              value={receiptShopName}
              onChange={e => setReceiptShopName(e.target.value)}
              onBlur={e => updateSettingValue('receipt_shop_name', e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>អក្សររត់ពីក្រោម</label>
            <input
              className="input-glass-admin"
              value={receiptSubtitle}
              onChange={e => setReceiptSubtitle(e.target.value)}
              onBlur={e => updateSettingValue('receipt_subtitle', e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>កំណត់ចំណាំហាង</label>
          <textarea
            className="input-glass-admin"
            rows="2"
            value={receiptNote}
            onChange={e => setReceiptNote(e.target.value)}
            onBlur={e => updateSettingValue('receipt_note', e.target.value)}
            placeholder="សូមអរគុណសម្រាប់ការគាំទ្រ!"
          />
        </div>
      </div>
      {/* Social Media & Contact Links */}
      <div className="glass-card-luxury">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 24 }}>📱</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>បណ្ដាញសង្គម / ទំនាក់ទំនង</div>
            <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>ភ្ជាប់បណ្ដាញសង្គមដើម្បីអោយអតិថិជនងាយស្រួលទាក់ទង</div>
            {(socialFb || socialTg || socialIg || socialTt || socialEmail) && (
              <div style={{ fontSize: 11, color: '#10b981', marginTop: 6, fontWeight: 800 }}>
                ✓ {lang === 'kh' ? 'បានភ្ជាប់ — នឹងបង្ហាញក្នុង My Account' : 'Linked — visible on My Account'}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.8 }}>លេខទូរស័ព្ទ / Phone</label>
              <input
                className="input-glass-admin"
                type="text"
                inputMode="tel"
                placeholder="012 345 678"
                value={shopPhone}
                onChange={e => setShopPhone(e.target.value)}
                onBlur={() => updateSettingValue('shop_phone', shopPhone.trim())}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.8 }}>ម៉ោងបើក / Hours</label>
              <input
                className="input-glass-admin"
                type="text"
                placeholder="8:00 AM – 9:00 PM"
                value={shopHours}
                onChange={e => setShopHours(e.target.value)}
                onBlur={() => updateSettingValue('shop_hours', shopHours.trim())}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.8 }}>ទីតាំង / Address</label>
            <input
              className="input-glass-admin"
              type="text"
              placeholder="Phnom Penh, Cambodia"
              value={shopAddress}
              onChange={e => setShopAddress(e.target.value)}
              onBlur={() => updateSettingValue('shop_address', shopAddress.trim())}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.8 }}>Facebook</label>
            <input
              className="input-glass-admin"
              type="text"
              inputMode="url"
              placeholder="https://facebook.com/..."
              value={socialFb}
              onChange={e => setSocialFb(e.target.value)}
              onBlur={() => persistSocialField('social_fb', 'url', socialFb, setSocialFb)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.8 }}>Telegram</label>
            <input
              className="input-glass-admin"
              type="text"
              inputMode="url"
              placeholder="@username ឬ https://t.me/..."
              value={socialTg}
              onChange={e => setSocialTg(e.target.value)}
              onBlur={() => persistSocialField('social_tg', 'telegram', socialTg, setSocialTg)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.8 }}>Instagram</label>
            <input
              className="input-glass-admin"
              type="text"
              inputMode="url"
              placeholder="https://instagram.com/..."
              value={socialIg}
              onChange={e => setSocialIg(e.target.value)}
              onBlur={() => persistSocialField('social_ig', 'url', socialIg, setSocialIg)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.8 }}>TikTok</label>
            <input
              className="input-glass-admin"
              type="text"
              inputMode="url"
              placeholder="https://tiktok.com/..."
              value={socialTt}
              onChange={e => setSocialTt(e.target.value)}
              onBlur={() => persistSocialField('social_tt', 'url', socialTt, setSocialTt)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.8 }}>WhatsApp</label>
            <input
              className="input-glass-admin"
              type="text"
              inputMode="tel"
              placeholder="85512345678"
              value={socialWa}
              onChange={e => setSocialWa(e.target.value)}
              onBlur={() => persistSocialField('social_wa', 'whatsapp', socialWa, setSocialWa)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.8 }}>Email</label>
            <input
              className="input-glass-admin"
              type="text"
              inputMode="email"
              placeholder="contact@example.com"
              value={socialEmail}
              onChange={e => setSocialEmail(e.target.value)}
              onBlur={() => persistSocialField('social_email', 'email', socialEmail, setSocialEmail)}
            />
          </div>
        </div>
      </div>

    </div>
  </div>
);
});

export default AdminSettingsTab;
