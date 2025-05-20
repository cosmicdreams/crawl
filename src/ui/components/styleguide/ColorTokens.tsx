// src/ui/components/styleguide/ColorTokens.tsx
import React, { useState } from 'react';
import { DesignToken } from '../../../core/types.js';

interface ColorTokensProps {
  tokens: DesignToken[];
}

const ColorTokens: React.FC<ColorTokensProps> = ({ tokens }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Get unique categories
  const categories = ['all', ...new Set(tokens.map(token => token.category || 'uncategorized'))];

  // Filter tokens by category and search query
  const filteredTokens = tokens.filter(token => {
    const matchesCategory = filterCategory === 'all' || token.category === filterCategory;
    const matchesSearch = searchQuery === '' || 
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.value.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Group tokens by category for better organization
  const groupedTokens: Record<string, DesignToken[]> = {};
  
  filteredTokens.forEach(token => {
    const category = token.category || 'uncategorized';
    if (!groupedTokens[category]) {
      groupedTokens[category] = [];
    }
    groupedTokens[category].push(token);
  });

  // Function to copy token value to clipboard
  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value);
    // Could add a toast notification here
  };

  // Function to get contrasting text color for a background
  const getContrastColor = (hexColor: string): string => {
    // Remove the hash if it exists
    hexColor = hexColor.replace('#', '');
    
    // Parse the color
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for bright colors, white for dark colors
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  return (
    <div className="color-tokens">
      <div className="tokens-header">
        <h2>Color Tokens</h2>
        <div className="tokens-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search colors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="category-filter">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' 
                    ? 'All Categories' 
                    : category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              Grid
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              List
            </button>
          </div>
        </div>
      </div>

      {filteredTokens.length === 0 ? (
        <div className="no-tokens">
          No color tokens found matching your criteria.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="tokens-grid">
          {Object.entries(groupedTokens).map(([category, categoryTokens]) => (
            <div key={category} className="category-section">
              <h3>{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
              <div className="color-grid">
                {categoryTokens.map(token => (
                  <div key={token.name} className="color-card">
                    <div 
                      className="color-preview" 
                      style={{ 
                        backgroundColor: token.value,
                        color: getContrastColor(token.value)
                      }}
                      onClick={() => copyToClipboard(token.value)}
                    >
                      <span className="color-value">{token.value}</span>
                    </div>
                    <div className="color-info">
                      <div className="color-name">{token.name}</div>
                      {token.description && (
                        <div className="color-description">{token.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="tokens-list">
          <table>
            <thead>
              <tr>
                <th>Preview</th>
                <th>Name</th>
                <th>Value</th>
                <th>Category</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredTokens.map(token => (
                <tr key={token.name}>
                  <td>
                    <div 
                      className="color-swatch" 
                      style={{ backgroundColor: token.value }}
                      onClick={() => copyToClipboard(token.value)}
                    ></div>
                  </td>
                  <td>{token.name}</td>
                  <td>
                    <code>{token.value}</code>
                  </td>
                  <td>{token.category || 'uncategorized'}</td>
                  <td>{token.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="usage-section">
        <h3>How to Use Color Tokens</h3>
        <div className="usage-examples">
          <div className="usage-example">
            <h4>CSS Variables</h4>
            <pre>
              <code>
                {`.element {
  color: var(--dt-color-primary);
  background-color: var(--dt-color-background);
}`}
              </code>
            </pre>
          </div>
          <div className="usage-example">
            <h4>SCSS Variables</h4>
            <pre>
              <code>
                {`.element {
  color: $color-primary;
  background-color: $color-background;
}`}
              </code>
            </pre>
          </div>
        </div>
      </div>

      <style jsx>{`
        .color-tokens {
          width: 100%;
        }

        .tokens-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .tokens-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .tokens-controls {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .search-box input {
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          width: 200px;
        }

        .category-filter select {
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          background-color: white;
        }

        .view-toggle {
          display: flex;
          border: 1px solid #ced4da;
          border-radius: 4px;
          overflow: hidden;
        }

        .view-toggle button {
          padding: 8px 12px;
          background-color: white;
          border: none;
          cursor: pointer;
        }

        .view-toggle button.active {
          background-color: #0066cc;
          color: white;
        }

        .no-tokens {
          padding: 40px;
          text-align: center;
          color: #6c757d;
        }

        .category-section {
          margin-bottom: 30px;
        }

        .category-section h3 {
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 1.2rem;
          color: #495057;
          border-bottom: 1px solid #dee2e6;
          padding-bottom: 5px;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 20px;
        }

        .color-card {
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .color-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .color-preview {
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .color-preview:hover {
          opacity: 0.9;
        }

        .color-value {
          font-family: monospace;
          font-size: 0.9rem;
        }

        .color-info {
          padding: 10px;
          background-color: white;
        }

        .color-name {
          font-weight: 500;
          margin-bottom: 5px;
        }

        .color-description {
          font-size: 0.85rem;
          color: #6c757d;
        }

        .tokens-list {
          width: 100%;
          overflow-x: auto;
        }

        .tokens-list table {
          width: 100%;
          border-collapse: collapse;
        }

        .tokens-list th, .tokens-list td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }

        .tokens-list th {
          background-color: #f8f9fa;
          font-weight: 500;
        }

        .color-swatch {
          width: 30px;
          height: 30px;
          border-radius: 4px;
          border: 1px solid #dee2e6;
          cursor: pointer;
        }

        .usage-section {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
        }

        .usage-section h3 {
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 1.2rem;
        }

        .usage-examples {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .usage-example {
          background-color: #f8f9fa;
          border-radius: 6px;
          padding: 15px;
        }

        .usage-example h4 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 1rem;
        }

        pre {
          background-color: #f1f3f5;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
          margin: 0;
        }

        code {
          font-family: monospace;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};

export default ColorTokens;
