import React from 'react';

const CategoryNavigator = ({ searchTerm, setSearchTerm, selectedCategory, setSelectedCategory }) => {
  const categories = [
    { id: 'all', label: 'ទាំងអស់' },
    { id: 'perfume', label: 'ទឹកអប់' },
    { id: 'bodycare', label: 'ថែរក្សាកាយ' },
    { id: 'new', label: 'ថ្មីៗ' }
  ];

  return (
    <div className="search-browse-wrapper animate-in">
      <div className="search-container">
        <div className="search-icon-fixed">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <input 
          type="text" 
          className="search-input" 
          placeholder="ស្វែងរកទំនិញដែលអ្នកស្រលាញ់..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
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
