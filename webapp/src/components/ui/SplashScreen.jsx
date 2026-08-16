import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onComplete }) => {
  const [stage, setStage] = useState('entering');

  useEffect(() => {
    // Stage 1: Logo fades in and shines (0 - 1500ms)
    // Stage 2: Background fades out (1500ms - 2200ms)
    // Stage 3: Unmount component (2500ms)
    
    const fadeOutTimer = setTimeout(() => {
      setStage('exiting');
    }, 1800);

    const completeTimer = setTimeout(() => {
      setStage('complete'); // ✅ Fix: set stage before calling onComplete so the guard below works
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (stage === 'complete') return null;

  return (
    <div className={`splash-screen-container ${stage === 'exiting' ? 'fade-out' : ''}`}>
      <div className="splash-logo-wrapper">
        <div className="splash-logo-text" style={{ fontSize: '32px' }} data-text="WELCOME TO">WELCOME TO</div>
        <div className="splash-subtitle">MARUN SHOP</div>
        <div className="splash-glow"></div>
      </div>
    </div>
  );
};

export default SplashScreen;
