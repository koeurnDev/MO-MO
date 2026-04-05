import React from 'react';

const SuccessOverlay = () => {
  const pieces = [...Array(50)];
  const colors = ['#01ba9d', '#ffd700', '#ff4757', '#3b82f6'];

  return (
    <div className="confetti-overlay">
      {pieces.map((_, i) => (
        <div 
          key={i} 
          className="confetti-piece" 
          style={{ 
            left: `${Math.random() * 100}%`, 
            background: colors[Math.floor(Math.random() * 4)],
            animationDelay: `${Math.random() * 2}s` 
          }} 
        />
      ))}
    </div>
  );
};

export default SuccessOverlay;
