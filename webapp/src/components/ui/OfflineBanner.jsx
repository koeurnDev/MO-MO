import React, { useState, useEffect } from 'react';

const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-24 left-5 right-5 z-[200] animate-in">
      <div className="bg-bold/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
          <span className="text-[11px] font-black uppercase tracking-widest">You are Offline</span>
        </div>
        <span className="text-[10px] font-bold opacity-70">Orders will auto-sync later</span>
      </div>
    </div>
  );
};

export default OfflineBanner;
