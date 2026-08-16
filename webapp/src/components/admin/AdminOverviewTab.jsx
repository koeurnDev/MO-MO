import React from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useUser } from '../../context/UserContext';

const CHART_STROKE = 'var(--text-dim, #64748b)';
const CHART_FILL = 'rgba(148, 163, 184, 0.22)';

const AdminOverviewTab = React.memo(({ summary, paddedDailyAnalytics, advancedAnalytics, orders, statusTags, BACKEND_URL }) => {
  const { t } = useUser();

  return (
    <div className="tab-pane-animate">
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-label">{t('admin_total_revenue')}</div>
          <div className="stat-value">${summary.totalRevenue.toLocaleString()}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">{t('admin_active_orders')}</div>
          <div className="stat-value">{summary.activeOrders}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">{t('admin_total_customers')}</div>
          <div className="stat-value">{summary.totalCustomers}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">{t('admin_shop_health')}</div>
          <div className="stat-value">{summary.businessHealth}%</div>
        </div>
      </div>

      <div className="glass-card-luxury admin-overview-card">
        <div className="admin-overview-head">
          <div className="admin-overview-section-title">{t('admin_analytics')}</div>
          <div className="admin-overview-actions">
            <button
              type="button"
              onClick={() => {
                const initData = window.Telegram?.WebApp?.initData || '';
                fetch(`${BACKEND_URL}/api/admin/orders/export`, { headers: { 'X-TG-Data': initData } })
                  .then(res => res.blob())
                  .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `MARUN_MINI_STORE_Orders_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                  });
              }}
              className="admin-action-chip"
            >
              {t('admin_export_csv')}
            </button>
            <div className="admin-action-chip">{t('admin_marketing_active')}</div>
          </div>
        </div>

        <div className="admin-overview-chart-box">
          <div className="admin-overview-chart-head">
            <span>{t('admin_revenue_growth')}</span>
            <span className="admin-overview-tag">USD</span>
          </div>
          <div className="admin-overview-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={paddedDailyAnalytics} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenueNeutral" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_STROKE} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={CHART_STROKE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.6} />
                <XAxis dataKey="dateShort" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-muted)' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-muted)' }} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14, color: 'var(--text-bold)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
                  itemStyle={{ color: 'var(--text-bold)', fontWeight: 900 }}
                  formatter={(value) => [`$${parseFloat(value).toFixed(2)}`, t('admin_revenue_label')]}
                />
                <Area type="monotone" dataKey="revenue" stroke={CHART_STROKE} fill="url(#colorRevenueNeutral)" strokeWidth={2.5} activeDot={{ r: 5, fill: CHART_STROKE, stroke: 'var(--bg-surface)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-overview-chart-box">
          <div className="admin-overview-chart-head">
            <span>{t('admin_orders_chart')}</span>
          </div>
          <div className="admin-overview-chart admin-overview-chart--short">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paddedDailyAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.6} />
                <XAxis dataKey="dateShort" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-muted)' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-muted)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14, color: 'var(--text-bold)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
                  itemStyle={{ color: 'var(--text-bold)', fontWeight: 900 }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  formatter={(value) => [`${value} ${t('admin_orders_label')}`, t('admin_orders_chart')]}
                />
                <Bar dataKey="orders" name="Orders" fill={CHART_STROKE} radius={[6, 6, 0, 0]} barSize={18} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-overview-aov">
          <div className="admin-overview-aov-label">{t('admin_avg_order_value')}</div>
          <div className="admin-overview-aov-value">${advancedAnalytics.aov?.aov?.toFixed(2) || '0.00'}</div>
        </div>

        <div className="admin-overview-lists">
          <div>
            <div className="admin-overview-list-title">{t('admin_top_products')}</div>
            {(advancedAnalytics.topProducts || []).map((p, i) => (
              <div key={i} className="admin-overview-list-row">
                <span className="admin-overview-list-name">{i + 1}. {p.product_name}</span>
                <span className="admin-overview-list-meta">x{p.total_quantity}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="admin-overview-list-title">{t('admin_top_customers')}</div>
            {(advancedAnalytics.topCustomers || []).map((c, i) => (
              <div key={i} className="admin-overview-list-row">
                <span className="admin-overview-list-name">{i + 1}. {c.user_name || 'Guest'}</span>
                <span className="admin-overview-list-meta">${parseFloat(c.total_spent).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card-luxury admin-overview-card">
        <div className="admin-overview-section-title admin-overview-section-title--spaced">{t('admin_tab_orders')}</div>
        {orders.slice(0, 3).map(o => (
          <div key={o.id} className="admin-overview-order-row">
            <div className="admin-overview-order-main">
              <span className="admin-overview-order-name">{o.user_name || 'Guest'}</span>
              <span className="admin-overview-order-code" title={String(o.order_code || o.id)}>
                {o.order_code || o.id}
              </span>
            </div>
            <div className="admin-overview-order-side">
              <span className="admin-overview-order-total">${parseFloat(o.total).toFixed(2)}</span>
              <span className="admin-overview-order-status">{(statusTags[o.status] || {}).label || o.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default AdminOverviewTab;
