import React from 'react';

const Hero = ({ user, setView, isAdmin }) => {
  const userAvatar = window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;

  return (
    <div className="hero-section animate-in" style={{ padding: '30px 20px 10px' }}>
       <div className="hero-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div 
             className="card-sticker" 
             style={{ 
                padding: '6px 15px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12, 
                borderWidth: 3,
                boxShadow: '0 8px 20px rgba(255, 114, 160, 0.1)'
             }}
          >
             <div 
                style={{ 
                  width: 40, height: 40, borderRadius: '50%', border: '3px solid white', overflow: 'hidden',
                  background: userAvatar ? `url(${userAvatar}) center/cover` : '#ff72a0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                }}
             >
                {!userAvatar && '🌸'}
             </div>
             <div>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#ff72a0', letterSpacing: 1 }}>WELCOME! 👋</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>
                  {user?.first_name || 'MO MO LOVER'}
                </div>
             </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
             <button 
                className="btn-bubbly" 
                style={{ width: 45, height: 45, padding: 0, fontSize: 20, borderRadius: 18 }} 
                onClick={() => setView('profile')}
             >
                👤
             </button>
             {isAdmin && (
                <button 
                  className="btn-bubbly" 
                  style={{ width: 45, height: 45, padding: 0, borderRadius: 18, background: 'linear-gradient(180deg, #1f2937 0%, #111827 100%)', boxShadow: '0 6px 0 #000' }} 
                  onClick={() => setView('admin')}
                >
                  ⚙️
                </button>
             )}
          </div>
       </div>

       <div style={{ textAlign: 'center', marginTop: 40, paddingBottom: 20 }}>
          <h1 className="animate-float" style={{ 
             margin: 0, 
             fontSize: 58, 
             fontWeight: 900, 
             color: '#ff72a0',
             textShadow: '3px 3px 0 #fff, 6px 6px 0 rgba(255, 114, 160, 0.2)',
             fontFamily: "'Bubblegum Sans', cursive",
             letterSpacing: '-2px'
          }}>
            Mo MO
          </h1>
          <p style={{ marginTop: 5, fontSize: 14, fontWeight: 800, color: '#ff1c1c', letterSpacing: 1 }}>
             ✨ Mo MO Bubbly Pop Boutique ✨
          </p>
       </div>
    </div>
  );
};

export default Hero;
