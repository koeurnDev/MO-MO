import React from 'react';

const Header = ({ setView, cartCount }) => {
  return (
    <header className="glass-panel" style={{ 
      position: 'sticky', 
      top: 10, 
      margin: '0 10px 20px', 
      zIndex: 100, 
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 10px 30px rgba(255, 114, 160, 0.15)',
      borderRadius: '25px'
    }}>
      <div 
        onClick={() => setView('home')} 
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <img 
          src="https://img.icons8.com/emoji/96/sparkles-emoji.png" 
          width="24" 
          alt="sparkles" 
          className="animate-float"
        />
        {/* Placeholder for the user's logo if they decide to host it, otherwise text-bubbly */}
        <h1 style={{ 
          margin: 0, 
          fontSize: 26, 
          fontWeight: 900, 
          color: '#ff72a0',
          textShadow: '2px 2px 0 #fff, 4px 4px 0 rgba(255, 114, 160, 0.2)',
          fontFamily: "'Bubblegum Sans', cursive"
        }}>
          Mo MO
        </h1>
      </div>

      <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
        <button 
          onClick={() => setView('user')}
          style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}
        >
          👤
        </button>
        <div 
          onClick={() => setView('cart')}
          style={{ position: 'relative', cursor: 'pointer', fontSize: 24 }}
        >
          🛒
          {cartCount > 0 && (
            <span className="badge-pop" style={{ position: 'absolute', top: -5, right: -8 }}>
              {cartCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
