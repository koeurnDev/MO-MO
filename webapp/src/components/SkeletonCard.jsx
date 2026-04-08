import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-img skeleton"></div>
      <div className="skeleton-title skeleton" style={{ width: '75%', marginTop: 12 }}></div>
      <div className="skeleton-price skeleton" style={{ width: '40%', marginTop: 'auto' }}></div>
    </div>
  );
};

export default SkeletonCard;
