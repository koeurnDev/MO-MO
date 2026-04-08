import React from 'react';

const CategoryNavigator = ({ searchTerm, setSearchTerm, selectedCategory, setSelectedCategory, t }) => {
  const [localSearch, setLocalSearch] = React.useState(searchTerm);
  const timeoutRef = React.useRef(null);

  const categories = [
    { id: 'all', label: t('all') },
    { id: 'perfume', label: t('perfume') },
    { id: 'bodycare', label: t('bodycare') },
    { id: 'new', label: t('new') }
  ];

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setLocalSearch(val);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setSearchTerm(val);
    }, 300); // 🛡 Senior 12-Year Exp: Debounced (300ms)
  };

  React.useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return (
    <div className="search-browse-wrapper animate-in">
      <div className="search-container">
        <div className="search-bar-luxury">
          <svg className="search-icon-fixed" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            className="search-input" 
            placeholder={t('search_placeholder')}
            value={localSearch}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <div className="category-navigator">
        {categories.map(cat => (
          <button 
            key={cat.id} 
            className={`cat-pill ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryNavigator;
