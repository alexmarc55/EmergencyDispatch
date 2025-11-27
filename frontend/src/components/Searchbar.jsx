import React, { useState } from 'react';
import './Searchbar.css';

const SearchBar = ({ 
  items = [], 
  onSearch,
  placeholder = "Search...",
  searchKeys = ["title"]
}) => {
  const [searchQuery, setSearchQuery] = useState('');

const handleSearch = (e) => {
  const value = e.target.value;
  setSearchQuery(value);
  
  // Filter items based on search query across multiple fields
  const filtered = value
    ? items.filter((item) => {
        return searchKeys.some(key => {
          const fieldValue = item[key];
          if (fieldValue === null || fieldValue === undefined) return false;
          return String(fieldValue).toLowerCase().includes(value.toLowerCase());
        });
      })
    : items;
  
  // pass filtered results 
  if (onSearch) {
    onSearch(filtered, value);
  }
};

  const handleClear = () => {
    setSearchQuery('');
    if (onSearch) {
      onSearch(items, '');
    }
  };

  return (
    <div className="search-container">
      <div className="search-bar">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder={placeholder}
          className="search-input"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="clear-button"
          >
            <svg 
              className="clear-icon" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;