import React from 'react';

const AdminSkeleton = () => {
  return (
    <div className="admin-skeleton-container" style={{ padding: 20 }}>
      <div className="skeleton-tabs" style={{ display: 'flex', gap: 10, marginBottom: 30 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="shimmer-luxury" style={{ width: 80, height: 36, borderRadius: 20, opacity: 0.1 }} />
        ))}
      </div>

      <div className="skeleton-overview" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Business Health Card */}
        <div className="shimmer-luxury" style={{ width: '100%', height: 260, borderRadius: 32, opacity: 0.05, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div className="shimmer-luxury" style={{ width: 120, height: 120, borderRadius: '50%', border: '8px solid rgba(255,255,255,0.05)' }} />
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="shimmer-luxury" style={{ height: 160, borderRadius: 28, opacity: 0.05 }} />
          <div className="shimmer-luxury" style={{ height: 160, borderRadius: 28, opacity: 0.05 }} />
        </div>

        {/* Recent Orders List */}
        <div className="shimmer-luxury" style={{ width: '100%', height: 40, borderRadius: 12, opacity: 0.1, marginBottom: 10 }} />
        {[1, 2, 3].map(i => (
          <div key={i} className="shimmer-luxury" style={{ width: '100%', height: 80, borderRadius: 20, opacity: 0.05, marginBottom: 10 }} />
        ))}
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-luxury {
          background: linear-gradient(90deg, 
            transparent 25%, 
            rgba(255, 255, 255, 0.05) 50%, 
            transparent 75%
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
        }
        [data-theme='light'] .shimmer-luxury {
          background: linear-gradient(90deg, 
            rgba(0,0,0,0.03) 25%, 
            rgba(0,0,0,0.06) 50%, 
            rgba(0,0,0,0.03) 75%
          );
        }
      `}</style>
    </div>
  );
};

export default AdminSkeleton;
