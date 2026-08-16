import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import DarkSelect from './DarkSelect';
import { useUser } from '../../context/UserContext';
import { useTelegram } from '../../context/TelegramContext';
import { getOptimizedThumbUrl, resolveItemImageUrl } from '../../utils/imageUtils';
import { extractOrderItemSpecs, formatSpecsForCopy, getVariantLabels } from '../../utils/orderItemUtils';
import { formatFullAddress } from '../../utils/deliveryUtils';

const BADGE_THEMES = {
  size: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
  color: { bg: 'rgba(236,72,153,0.15)', color: '#ec4899' },
  weight: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  height: { bg: 'rgba(168,85,247,0.15)', color: '#a855f7' },
  variant: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
};

const OrderItemVariantBadges = ({ item, lang = 'kh', style = {} }) => {
  const specs = extractOrderItemSpecs(item);
  const labels = getVariantLabels(lang, {
    category: item?.category || '',
    productName: item?.name || item?.product_name || '',
    sizeValue: specs.size
  });
  const rows = [
    ['size', specs.size],
    ['color', specs.color],
    ['weight', specs.weight],
    ['height', specs.height],
    ['variant', specs.variant && !specs.size && !specs.color ? specs.variant : '']
  ].filter(([, value]) => value);

  if (!rows.length) return null;

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, ...style }}>
      {rows.map(([key, value]) => {
        const theme = BADGE_THEMES[key];
        return (
          <span
            key={key}
            style={{
              background: theme.bg,
              color: theme.color,
              padding: '2px 7px',
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 900,
              whiteSpace: 'nowrap'
            }}
          >
            {labels[key]}: {value}
          </span>
        );
      })}
    </div>
  );
};

const PackCheckbox = ({ checked }) => (
  <span
    aria-hidden="true"
    style={{
      width: 18,
      height: 18,
      borderRadius: 5,
      border: `2px solid ${checked ? '#10b981' : '#cbd5e1'}`,
      background: checked ? '#10b981' : '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      color: '#fff',
      fontSize: 11,
      fontWeight: 900,
      lineHeight: 1
    }}
  >
    {checked ? '✓' : ''}
  </span>
);

const OrderItemThumb = ({ item, productById }) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  const name = item?.name || item?.product_name || '';
  const initial = name ? name.charAt(0).toUpperCase() : '📦';
  const rawUrl = resolveItemImageUrl(item, productById);
  const src = rawUrl ? getOptimizedThumbUrl(rawUrl, 80) : '';
  const showPhoto = src && !imgFailed;

  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        flexShrink: 0,
        overflow: 'hidden',
        background: showPhoto ? 'var(--bg-soft)' : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 900,
        color: '#64748b',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {showPhoto ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
};

const AdminOrdersTab = React.memo(({
  orders, searchTerm, orderFilter, setOrderFilter,
  localSearchTerm, setLocalSearchTerm,
  updateStatus, setPrintingOrder, statusTags,
  trackingNumbers = {}, setTrackingNumbers,
  products = []
}) => {
  const { t, lang } = useUser();
  const { showPopup, showAlert, tg } = useTelegram();
  const [sortDirection, setSortDirection] = React.useState('newest'); // 'newest' | 'oldest'
  const [checkedItems, setCheckedItems] = React.useState({}); // { [orderId_itemIdx]: true }
  const [courierFilter, setCourierFilter] = React.useState('all'); // 'all' | courierName
  const [showPickList, setShowPickList] = React.useState(false);
  const [expandedReceipts, setExpandedReceipts] = React.useState({});

  const toggleReceipt = (orderId) => {
    setExpandedReceipts(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // 📊 Calculate Order Counts & Multi-order Customers for Staff
  const { counts, phoneCounts, courierOptions, grabCount } = useMemo(() => {
    let toPack = 0;
    let shipped = 0;
    let pending = 0;
    let grabC = 0;
    const phoneMap = {};
    const couriers = new Set();
    orders.forEach(o => {
      if (['paid', 'processing'].includes(o.status)) toPack++;
      if (['shipped', 'delivering'].includes(o.status)) shipped++;
      if (o.status === 'pending') pending++;

      if (o.delivery_company) couriers.add(o.delivery_company);
      if ((o.delivery_company || '').toLowerCase().includes('grab') && ['paid', 'processing'].includes(o.status)) {
        grabC++;
      }

      if (o.phone && ['paid', 'processing', 'pending'].includes(o.status)) {
        phoneMap[o.phone] = (phoneMap[o.phone] || 0) + 1;
      }
    });

    const cOptions = [{ value: 'all', label: '🚚 គ្រប់ក្រុមហ៊ុនដឹក' }, ...Array.from(couriers).map(c => ({ value: c, label: `🚚 ${c}` }))];
    return { counts: { toPack, shipped, pending, total: orders.length - pending }, phoneCounts: phoneMap, courierOptions: cOptions, grabCount: grabC };
  }, [orders]);

  const toggleCheckItem = (orderId, itemIdx) => {
    const key = `${orderId}_${itemIdx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const productById = useMemo(() => {
    const map = new Map();
    (products || []).forEach(p => {
      if (p?.id != null) map.set(String(p.id), p);
    });
    return map;
  }, [products]);

  const ORDER_FILTER_OPTIONS = useMemo(() => [
    { value: 'all', label: `📦 ${t('admin_filter_all')} (${counts.total})` },
    { value: 'pending', label: `⌛ ${t('admin_filter_pending')} (${counts.pending})` },
    { value: 'processing', label: `📦 ${t('admin_filter_preparing')} (${counts.toPack})` },
    { value: 'shipped', label: `🚚 ${t('admin_filter_shipped')} (${counts.shipped})` },
    { value: 'cancelled', label: t('admin_filter_cancelled') },
  ], [t, counts]);

  const ORDER_STATUS_OPTIONS = useMemo(() => [
    { value: 'pending', label: lang === 'kh' ? 'រង់ចាំការបញ្ជាក់' : 'Awaiting confirmation' },
    { value: 'paid', label: lang === 'kh' ? 'កំពុងរៀបចំ' : 'Preparing' },
    { value: 'processing', label: lang === 'kh' ? 'កំពុងរៀបចំ' : 'Preparing' },
    { value: 'shipped', label: lang === 'kh' ? 'ប្រគល់ជូនអ្នកដឹក' : 'Handed to courier' },
    { value: 'cancelled', label: lang === 'kh' ? 'បានបោះបង់' : 'Cancelled' }
  ], [lang]);

  const getOrderStatusLabel = (status) => {
    if (lang === 'kh') {
      if (status === 'pending') return 'រង់ចាំការបញ្ជាក់';
      if (['paid', 'processing'].includes(status)) return 'កំពុងរៀបចំ';
      if (['shipped', 'delivering', 'delivered'].includes(status)) return 'ប្រគល់ជូនអ្នកដឹក';
      if (status === 'cancelled') return 'បានបោះបង់';
    }
    const key = status === 'delivered' ? 'shipped' : (status === 'paid' ? 'processing' : status);
    return ORDER_STATUS_OPTIONS.find(opt => opt.value === key)?.label || status;
  };

  const getOrderStatusClass = (status) => {
    if (['paid', 'processing'].includes(status)) return 'admin-status-select--processing';
    if (['shipped', 'delivering', 'delivered'].includes(status)) return 'admin-status-select--shipped';
    if (status === 'cancelled') return 'admin-status-select--cancelled';
    return 'admin-status-select--pending';
  };

  const canCancelOrder = (status) => ['paid', 'processing'].includes(status);

  const filtered = useMemo(() => {
    const list = orders.filter(o => {
      const matchesSearch = (o.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        || (o.order_code || '').toLowerCase().includes(searchTerm.toLowerCase())
        || (o.phone || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCourier = courierFilter === 'all' || o.delivery_company === courierFilter;

      if (!matchesCourier) return false;

      if (orderFilter === 'pending') return matchesSearch && o.status === 'pending';
      if (orderFilter === 'processing') return matchesSearch && ['paid', 'processing'].includes(o.status);
      if (orderFilter === 'shipped') return matchesSearch && (o.status === 'shipped' || o.status === 'delivering');
      if (orderFilter === 'cancelled') return matchesSearch && o.status === 'cancelled';
      if (orderFilter === 'all' && !searchTerm) return o.status !== 'pending';
      return matchesSearch;
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return sortDirection === 'oldest' ? timeA - timeB : timeB - timeA;
    });
  }, [orders, searchTerm, orderFilter, courierFilter, sortDirection]);

  // 📦 Compute Aggregated Stock Pick List for Warehouse Staff
  const batchPickSummary = useMemo(() => {
    const map = {};
    let totalItemsCount = 0;
    filtered.forEach(o => {
      let items = [];
      try {
        items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
      } catch (e) {}

      items.forEach(it => {
        const name = it.name || it.product_name || 'ទំនិញ';
        const specs = extractOrderItemSpecs(it);
        const { size, color, weight, height, variant } = specs;
        const qty = Number(it.quantity) || 1;

        const key = `${name}_${size}_${color}_${weight}_${height}_${variant}`;
        if (!map[key]) {
          map[key] = {
            name, ...specs, totalQty: 0,
            id: it.id,
            image: resolveItemImageUrl(it, productById)
          };
        }
        map[key].totalQty += qty;
        totalItemsCount += qty;
      });
    });
    return { list: Object.values(map), totalItemsCount };
  }, [filtered, productById]);

  return (
    <div className="tab-pane-animate">
      {/* 🔍 Search & Clean Filter Bar */}
      <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Row 1: Search Input */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            className="input-glass-admin"
            style={{ width: '100%', fontSize: 13, padding: '10px 36px 10px 14px', borderRadius: 12, boxSizing: 'border-box' }}
            placeholder={t('admin_search_order') || '🔍 ស្វែងរកតាម Order ID / ឈ្មោះ / លេខទូរស័ព្ទ...'}
            value={localSearchTerm}
            onChange={e => setLocalSearchTerm(e.target.value)}
          />
          {localSearchTerm && (
            <button 
              onClick={() => setLocalSearchTerm('')} 
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, fontWeight: 900 }}
            >
              ✖
            </button>
          )}
        </div>

        {/* Row 2: Status & courier dropdowns */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <DarkSelect
              style={{ width: '100%' }}
              value={orderFilter}
              onChange={setOrderFilter}
              options={ORDER_FILTER_OPTIONS}
            />
          </div>
          {courierOptions.length > 1 && (
            <div style={{ flex: 1, minWidth: 140 }}>
              <DarkSelect
                style={{ width: '100%' }}
                value={courierFilter}
                onChange={setCourierFilter}
                options={courierOptions}
              />
            </div>
          )}
        </div>

        {/* Row 3: Quick actions */}
        <div className="admin-order-actions-row">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {grabCount > 0 && (
              <button
                type="button"
                className="admin-action-pill"
                onClick={() => {
                  setOrderFilter('processing');
                  setCourierFilter(prev => prev === 'grab' ? 'all' : 'grab');
                }}
                style={{
                  border: courierFilter === 'grab' ? 'none' : '1px solid #00b14f',
                  background: courierFilter === 'grab' ? '#00b14f' : 'rgba(0,177,79,0.12)',
                  color: courierFilter === 'grab' ? '#fff' : '#00b14f',
                }}
              >
                🛵 Grab ({grabCount})
              </button>
            )}

            <button
              type="button"
              className="admin-action-pill"
              onClick={() => setShowPickList(true)}
              style={{
                border: '1px solid #10b981',
                background: 'rgba(16,185,129,0.15)',
                color: '#10b981',
              }}
            >
              📋 យកអីវ៉ាន់ពីឃ្លាំង ({batchPickSummary.totalItemsCount})
            </button>
          </div>

          <button
            type="button"
            className="admin-action-pill"
            onClick={() => setSortDirection(prev => prev === 'newest' ? 'oldest' : 'newest')}
            style={{
              padding: '6px 10px',
              borderRadius: 10,
              fontSize: 10,
              background: sortDirection === 'oldest' ? 'rgba(245,158,11,0.2)' : 'var(--bg-soft)',
              color: sortDirection === 'oldest' ? '#f59e0b' : 'var(--text-muted)',
              border: sortDirection === 'oldest' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
            }}
          >
            {sortDirection === 'oldest' ? '⚠️ ចាស់មុន' : '⬇️ ថ្មីមុន'}
          </button>
        </div>
      </div>

      {showPickList && createPortal(
        <div className="admin-dashboard-overhaul admin-picklist-modal-overlay" onClick={() => setShowPickList(false)}>
          <div className="admin-picklist-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="admin-picklist-modal-header">
              <div className="admin-picklist-modal-title">📦 បញ្ជីសរុបទំនិញត្រូវយកពីឃ្លាំង</div>
              <button type="button" className="admin-picklist-modal-close" onClick={() => setShowPickList(false)} aria-label="Close">✕</button>
            </div>

            <div className="admin-picklist-modal-desc">
              សរុបទំនិញទាំង <strong>{filtered.length}</strong> ការកុម្ម៉ង់ដែលកំពុង Filter (<strong>{batchPickSummary.totalItemsCount} មុខ</strong>) សម្រាប់ Staff ទៅដកពីឃ្លាំងក្នុងពេលតែមួយ៖
            </div>

            <div className="admin-picklist-modal-list">
              {batchPickSummary.list.length === 0 ? (
                <div className="admin-picklist-modal-empty">គ្មានទំនិញត្រូវដកពីឃ្លាំងទេ</div>
              ) : (
                batchPickSummary.list.map((it, idx) => (
                  <div key={idx} className="admin-picklist-modal-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <OrderItemThumb item={it} productById={productById} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-bold)' }}>{it.name}</div>
                        <OrderItemVariantBadges item={it} lang={lang} />
                      </div>
                    </div>
                    <div className="admin-picklist-modal-qty">x{it.totalQty}</div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="admin-picklist-modal-copy"
              onClick={() => {
                const text = `📦 បញ្ជីសរុបទំនិញត្រូវដកពីឃ្លាំង (${batchPickSummary.totalItemsCount} មុខ):\n` +
                  batchPickSummary.list.map(i => {
                    const specs = extractOrderItemSpecs(i);
                    return `• ${i.name}${formatSpecsForCopy(specs, lang, { category: i.category, productName: i.name })} => x${i.totalQty}`;
                  }).join('\n');
                navigator.clipboard.writeText(text);
                if (showAlert) showAlert('បាន Copy បញ្ជីសរុបទំនិញឃ្លាំង ជោគជ័យ!');
              }}
            >
              📋 Copy បញ្ជីដកពីឃ្លាំង
            </button>
          </div>
        </div>,
        document.body
      )}

      {filtered.map(o => {
        let items = [];
        try {
          items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
        } catch (e) {}

        const fullAddr = formatFullAddress(o.address, o.province);

        const orderTime = new Date(o.created_at || Date.now());
        const now = new Date();
        const diffHours = Math.floor((now - orderTime) / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        const timeLabel = orderTime.toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh', hour12: true, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const isLeftover = diffHours >= 12 && ['paid', 'processing'].includes(o.status);

        const hasMultipleOrders = o.phone && (phoneCounts[o.phone] || 0) > 1;
        const cleanUserName = (o.user_name || '').replace(/\s*-\s*$/, '').trim() || (lang === 'kh' ? 'អតិថិជន' : 'Customer');

        return (
          <div key={o.id} className={`glass-card-luxury admin-order-card${o.status === 'cancelled' ? ' admin-order-card--cancelled' : ''}`} style={{ borderLeft: isLeftover ? '4px solid var(--text-dim)' : hasMultipleOrders ? '4px solid var(--text-muted, #94a3b8)' : 'none' }}>
            <div className="admin-order-card-header">
              <div className="admin-order-card-meta">
                <span className="admin-order-chip admin-order-chip--id">#{o.order_code || o.id}</span>
                {hasMultipleOrders && (
                  <span className="admin-order-chip admin-order-chip--hint">
                    {phoneCounts[o.phone]} {lang === 'kh' ? 'កម្ម៉ង់រួម' : 'linked'}
                  </span>
                )}
                {isLeftover && (
                  <span className="admin-order-chip admin-order-chip--warn">
                    {lang === 'kh' ? 'សេសសល់' : 'Left'} {diffDays > 0 ? `${diffDays}ថ្ងៃ` : `${diffHours}ម`}
                  </span>
                )}
              </div>

              <span className={`admin-order-status-badge ${getOrderStatusClass(o.status)}`}>
                {getOrderStatusLabel(o.status)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-bold)' }}>{cleanUserName}</div>
                {o.phone && (
                  <div style={{ fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <a href={`tel:${o.phone}`} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 800 }}>
                      📞 {o.phone}
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(o.phone);
                        if (showAlert) showAlert(`បាន Copy លេខទូរស័ព្ទ (${o.phone}) ជោគជ័យ!`);
                      }}
                      style={{ padding: '2px 6px', borderRadius: 6, fontSize: 10, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', cursor: 'pointer', fontWeight: 800 }}
                    >
                      📋 Copy
                    </button>
                  </div>
                )}
                {fullAddr && (
                  <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span>📍 {fullAddr}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(fullAddr);
                        if (showAlert) showAlert('បាន Copy អាសយដ្ឋាន ជោគជ័យ!');
                      }}
                      style={{ padding: '2px 6px', borderRadius: 6, fontSize: 10, background: 'var(--bg-soft)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', cursor: 'pointer', fontWeight: 800 }}
                    >
                      📋 Copy
                    </button>
                  </div>
                )}
                {o.delivery_company && <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4, color: 'var(--text-main)' }}>🚚 ក្រុមហ៊ុនដឹក៖ <strong>{o.delivery_company}</strong></div>}
                {o.note && (
                  <div style={{ fontSize: 11, color: '#d97706', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '4px 8px', fontWeight: 800, marginTop: 4 }}>
                    ចំណាំ៖ {o.note}
                  </div>
                )}
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3, color: 'var(--text-muted)' }}>{timeLabel}</div>
              </div>
              <div style={{ fontSize: 17, fontWeight: 950, textAlign: 'right', color: 'var(--text-bold)', flexShrink: 0 }}>${parseFloat(o.total).toFixed(2)}</div>
            </div>

            {/* 🛍️ Staff Packing Items List with Checkboxes & Badges */}
            {items.length > 0 && (
              <div style={{ background: 'var(--bg-soft)', borderRadius: 10, padding: '8px 10px', marginBottom: 10, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-bold)', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span>បញ្ជីទំនិញ ({items.length} មុខ)</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>ចុចពេលរៀបចំរួច</span>
                </div>
                {items.map((it, idx) => {
                  const itemKey = `${o.id}_${idx}`;
                  const isChecked = !!checkedItems[itemKey];
                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleCheckItem(o.id, idx)}
                      style={{ 
                        fontSize: 12, fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, padding: '5px 6px', borderRadius: 8, cursor: 'pointer',
                        background: isChecked ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                        border: '1px solid ' + (isChecked ? 'rgba(16,185,129,0.3)' : 'transparent'),
                        textDecoration: isChecked ? 'line-through' : 'none',
                        opacity: isChecked ? 0.7 : 1,
                        transition: 'all 0.2s ease'
                      }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        <PackCheckbox checked={isChecked} />
                        <OrderItemThumb item={it} productById={productById} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ color: 'var(--text-bold)', display: 'block', fontSize: 12 }}>{it.name || it.product_name}</span>
                          <OrderItemVariantBadges item={it} lang={lang} style={{ marginTop: 2 }} />
                        </span>
                      </span>
                      <span style={{ fontWeight: 900, color: isChecked ? '#10b981' : '#ec4899', fontSize: 13 }}>x{it.quantity || 1}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 🧾 Collapsible Payment Receipt Attachment */}
            {o.receipt_url && (
              <div style={{ width: '100%', marginBottom: 12 }}>
                <button
                  onClick={() => toggleReceipt(o.id)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border-subtle)',
                    background: expandedReceipts[o.id] ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-soft)',
                    color: expandedReceipts[o.id] ? '#3b82f6' : 'var(--text-main)',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <span>🧾 វិក្កយបត្របង់ប្រាក់ (ABA PAY / Receipt)</span>
                  <span>{expandedReceipts[o.id] ? '▲ បិទរូប' : '▼ មើលរូបភាព'}</span>
                </button>

                {expandedReceipts[o.id] && (
                  <div style={{ marginTop: 8, textAlign: 'center', background: 'var(--bg-soft)', padding: 10, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                    <img
                      src={o.receipt_url}
                      alt="Receipt"
                      style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: 8, cursor: 'pointer', background: 'rgba(0,0,0,0.1)' }}
                      onClick={() => {
                        if (tg?.openLink) tg.openLink(o.receipt_url);
                        else window.open(o.receipt_url, '_blank');
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="button-group-pro admin-order-actions" style={{ flexWrap: 'wrap', gap: 6 }}>
              {['shipped', 'delivering', 'delivered'].includes(o.status) ? (
                <div className="admin-order-actions--shipped-only">
                  {setTrackingNumbers && (
                    <input
                      type="text"
                      className="input-glass-admin admin-order-tracking"
                      placeholder={t('admin_tracking_no')}
                      value={trackingNumbers[o.id] !== undefined ? trackingNumbers[o.id] : (o.tracking_number || '')}
                      onChange={(e) => setTrackingNumbers(prev => ({ ...prev, [o.id]: e.target.value }))}
                    />
                  )}
                  <button className="icon-btn-admin admin-order-print" aria-label="Print Order" onClick={() => {
                    if (tg && ['android', 'ios'].includes(tg.platform) && showPopup) {
                      showPopup({
                        title: 'ជម្រើស Print / Copy ស្លឹកកុម្ម៉ង់',
                        message: 'Telegram មិនអនុញ្ញាតឱ្យ Print ផ្ទាល់ទេ។ សូមជ្រើសរើស:',
                        buttons: [
                          { id: 'copy', type: 'default', text: 'ចម្លងអត្ថបទរៀបចំអីវ៉ាន់ (Copy Slip)' },
                          { id: 'browser', type: 'default', text: 'បើក Print ពេញលេញក្នុង Browser' },
                          { type: 'cancel' }
                        ]
                      }, (buttonId) => {
                        if (buttonId === 'copy') {
                          try {
                            const itemsText = items.map(i => {
                              const specs = extractOrderItemSpecs(i);
                              return `- ${i.name || i.product_name} x${i.quantity || 1}${formatSpecsForCopy(specs, lang, { category: i.category, productName: i.name || i.product_name })}`;
                            }).join('\n');
                            const text = `📋 ស្លឹកកុម្ម៉ង់រៀបចំអីវ៉ាន់\nលេខកូដ: ${o.order_code || o.id}\nអតិថិជន: ${cleanUserName}\nទូរស័ព្ទ: ${o.phone}\nទីតាំង: ${fullAddr || '—'}\nក្រុមហ៊ុនដឹក: ${o.delivery_company || '—'}\nចំណាំ: ${o.note || 'គ្មាន'}\n----------------\n${itemsText}\n----------------\nសរុប: $${parseFloat(o.total).toFixed(2)}`;
                            navigator.clipboard.writeText(text);
                            showAlert("បានចម្លងស្លឹកកុម្ម៉ង់ (Copy Slip) ជោគជ័យ!");
                          } catch (e) {
                            console.error(e);
                            showAlert("មានបញ្ហាក្នុងការចម្លង!");
                          }
                        } else if (buttonId === 'browser') {
                          showAlert("ដើម្បី Print ជាវិក្កយបត្រពេញលេញ:\n1. ចុច (⋮) → Open in browser\n2. ចុច Print");
                        }
                      });
                    } else {
                      if (setPrintingOrder) setPrintingOrder(o);
                      setTimeout(() => window.print(), 300);
                    }
                  }}>Print</button>
                </div>
              ) : (
                <>
              {['paid', 'processing'].includes(o.status) && setTrackingNumbers && (
                <div style={{ width: '100%', marginBottom: 4 }}>
                  <input
                    type="text"
                    className="input-glass-admin admin-order-tracking"
                    placeholder={t('admin_tracking_no')}
                    value={trackingNumbers[o.id] !== undefined ? trackingNumbers[o.id] : (o.tracking_number || '')}
                    onChange={(e) => setTrackingNumbers(prev => ({ ...prev, [o.id]: e.target.value }))}
                  />
                </div>
              )}
              {o.status === 'pending' && (
                <div className="admin-order-pending-actions">
                  <button
                    type="button"
                    className="ticket-btn-primary admin-order-btn"
                    onClick={() => updateStatus(o.id ?? o.order_code, 'paid')}
                  >
                    {t('admin_confirm_payment')}
                  </button>
                  <button
                    type="button"
                    className="admin-order-btn admin-order-btn--muted"
                    onClick={() => updateStatus(o.id ?? o.order_code, 'cancelled')}
                  >
                    {t('admin_not_paid')}
                  </button>
                </div>
              )}
              {o.status === 'paid' && (
                <button className="ticket-btn-primary admin-order-btn admin-order-btn--blue" onClick={() => updateStatus(o.id ?? o.order_code, 'processing')}>
                  2. កំពុងរៀបចំ
                </button>
              )}
              {o.status === 'processing' && (
                <button className="ticket-btn-primary admin-order-btn admin-order-btn--purple" onClick={() => updateStatus(o.id ?? o.order_code, 'shipped')}>
                  3. ប្រគល់ជូនអ្នកដឹក
                </button>
              )}
              {['paid', 'processing'].includes(o.status) && (
                <button className="icon-btn-admin admin-order-print" aria-label="Print Order" onClick={() => {
                  if (tg && ['android', 'ios'].includes(tg.platform) && showPopup) {
                    showPopup({
                      title: 'ជម្រើស Print / Copy ស្លឹកកុម្ម៉ង់',
                      message: 'Telegram មិនអនុញ្ញាតឱ្យ Print ផ្ទាល់ទេ។ សូមជ្រើសរើស:',
                      buttons: [
                        { id: 'copy', type: 'default', text: 'ចម្លងអត្ថបទរៀបចំអីវ៉ាន់ (Copy Slip)' },
                        { id: 'browser', type: 'default', text: 'បើក Print ពេញលេញក្នុង Browser' },
                        { type: 'cancel' }
                      ]
                    }, (buttonId) => {
                      if (buttonId === 'copy') {
                        try {
                          const itemsText = items.map(i => {
                            const specs = extractOrderItemSpecs(i);
                            return `- ${i.name || i.product_name} x${i.quantity || 1}${formatSpecsForCopy(specs, lang, { category: i.category, productName: i.name || i.product_name })}`;
                          }).join('\n');
                          const text = `📋 ស្លឹកកុម្ម៉ង់រៀបចំអីវ៉ាន់\nលេខកូដ: ${o.order_code || o.id}\nអតិថិជន: ${cleanUserName}\nទូរស័ព្ទ: ${o.phone}\nទីតាំង: ${fullAddr || '—'}\nក្រុមហ៊ុនដឹក: ${o.delivery_company || '—'}\nចំណាំ: ${o.note || 'គ្មាន'}\n----------------\n${itemsText}\n----------------\nសរុប: $${parseFloat(o.total).toFixed(2)}`;
                          navigator.clipboard.writeText(text);
                          showAlert("បានចម្លងស្លឹកកុម្ម៉ង់ (Copy Slip) ជោគជ័យ! អាច Send ទៅក្រុមការងារ ឬរៀបចំអីវ៉ាន់បាន។");
                        } catch (e) {
                          console.error(e);
                          showAlert("មានបញ្ហាក្នុងការចម្លង!");
                        }
                      } else if (buttonId === 'browser') {
                        showAlert("ដើម្បី Print ជាវិក្កយបត្រពេញលេញ:\n1. ចុចសញ្ញា (⋮) នៅខាងលើស្តាំ\n2. ជ្រើសរើសយក 'Open in browser'\n3. ចុចប៊ូតុង Print ម្ដងទៀតក្នុង Browser!");
                      }
                    });
                  } else {
                    if (setPrintingOrder) setPrintingOrder(o);
                    setTimeout(() => window.print(), 300);
                  }
                }}>Print</button>
              )}
              {canCancelOrder(o.status) && (
                <button
                  type="button"
                  className="admin-order-cancel-link"
                  onClick={() => updateStatus(o.id ?? o.order_code, 'cancelled')}
                >
                  {lang === 'kh' ? 'បោះបង់ការកម្ម៉ង់' : 'Cancel order'}
                </button>
              )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default AdminOrdersTab;
