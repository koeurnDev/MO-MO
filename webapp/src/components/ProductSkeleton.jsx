import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-img skeleton"></div>
      <div className="skeleton-title skeleton" style={{ width: '70%', marginTop: 10 }}></div>
      <div className="skeleton-price skeleton" style={{ marginTop: 'auto' }}></div>
    </div>
  );
};

const ProductSkeleton = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-img"></div>
      <div className="skeleton-title skeleton" style={{ width: '85%', marginBottom: 8 }}></div>
      <div className="skeleton-title skeleton" style={{ width: '60%' }}></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <div className="skeleton-price skeleton"></div>
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 12 }}></div>
      </div>
    </div>
  );
};

export default ProductSkeleton;
