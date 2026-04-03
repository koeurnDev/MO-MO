import React from 'react';

const Header = ({ view, setView }) => {
  return (
    <>
      <header className="main-header">
        <button className="back-btn" onClick={() => setView('home')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <h1 className="app-title">{view === 'home' ? 'replicaaroma' : 'បញ្ជាក់ការបញ្ជាទិញ'}</h1>
        <div style={{ width: 44 }}></div>
      </header>

      <section className="stepper-header">
        <div className="stepper-line"></div>
        <div className={`step-circle ${view === 'home' ? 'active' : 'completed'}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <div className={`step-circle ${view === 'checkout' ? 'active' : ''}`} style={{ position: 'relative' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        </div>
        <div className="step-circle">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      </section>
    </>
  );
};

export default Header;
