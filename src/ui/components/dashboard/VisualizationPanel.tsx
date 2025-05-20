// src/ui/components/dashboard/VisualizationPanel.tsx
import React, { useState } from 'react';
import { DesignToken } from '../../../core/types.js';
import { ExtractedData } from '../../api/client.js';
import styles from './VisualizationPanel.module.css';

interface VisualizationPanelProps {
  /** The type of tokens to visualize (e.g., 'color', 'typography') */
  type: 'color' | 'typography' | 'spacing' | 'border' | 'animation';
  /** Array of design tokens to display */
  tokens: DesignToken[];
  /** Optional extracted data for context (not currently used in this component) */
  extractedData: ExtractedData | null;
}

const VisualizationPanel: React.FC<VisualizationPanelProps> = ({
  type,
  tokens = [], // Add default empty array
  extractedData
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'value'>('name');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Get unique categories with null check
  const categories = ['all', ...new Set(tokens?.map(token => token.category || 'uncategorized') || [])];

  // Filter tokens by category with null check
  const filteredTokens = filterCategory === 'all'
    ? tokens || []
    : (tokens || []).filter(token => (token.category || 'uncategorized') === filterCategory);

  // Sort tokens
  const sortedTokens = [...(filteredTokens || [])].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'usage') {
      return (b.usageCount || 0) - (a.usageCount || 0);
    } else {
      // Basic value sort, might need refinement for different types
      return String(a.value).localeCompare(String(b.value));
    }
  });

  // Render color tokens
  const renderColorTokens = () => {
    const gridClass = viewMode === 'grid' ? styles.colorTokensGrid : styles.colorTokensList;
    return (
      <div className={`${styles.colorTokens} ${gridClass}`}>
        {sortedTokens.map(token => (
          <div key={token.name} className={styles.tokenItem}>
            <div
              className={styles.colorPreview}
              style={{ backgroundColor: token.value }}
            ></div>
            <div className={styles.tokenDetails}>
              <div className={styles.tokenName}>{token.name}</div>
              <div className={styles.tokenValue}>{token.value}</div>
              {token.usageCount !== undefined && (
                <div className={styles.tokenUsage}>Used {token.usageCount} times</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render typography tokens
  const renderTypographyTokens = () => {
    const gridClass = viewMode === 'grid' ? styles.typographyTokensGrid : '';
    return (
      <div className={`${styles.typographyTokens} ${gridClass}`}>
        {sortedTokens.map(token => {
          const fontFamily = token.properties?.fontFamily || 'system-ui';
          const fontSize = token.properties?.fontSize || '16px';
          const fontWeight = token.properties?.fontWeight || 'normal';
          const lineHeight = token.properties?.lineHeight || 'normal';

          return (
            <div key={token.name} className={styles.tokenItem}>
              <div
                className={styles.typographyPreview}
                style={{
                  fontFamily,
                  fontSize,
                  fontWeight,
                  lineHeight
                }}
              >
                The quick brown fox jumps over the lazy dog
              </div>
              <div className={styles.tokenDetails}>
                <div className={styles.tokenName}>{token.name}</div>
                <div className={styles.tokenProperties}>
                  <div>Font: {fontFamily}</div>
                  <div>Size: {fontSize}</div>
                  <div>Weight: {fontWeight}</div>
                  <div>Line Height: {lineHeight}</div>
                </div>
                {token.usageCount !== undefined && (
                  <div className={styles.tokenUsage}>Used {token.usageCount} times</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render spacing tokens
  const renderSpacingTokens = () => {
    const gridClass = viewMode === 'grid' ? styles.spacingTokensGrid : styles.spacingTokensList;
    return (
      <div className={`${styles.spacingTokens} ${gridClass}`}>
        {sortedTokens.map(token => (
          <div key={token.name} className={styles.tokenItem}>
            <div className={styles.spacingPreview}>
              <div
                className={styles.spacingBox}
                style={{ width: token.value }}
              ></div>
            </div>
            <div className={styles.tokenDetails}>
              <div className={styles.tokenName}>{token.name}</div>
              <div className={styles.tokenValue}>{token.value}</div>
              {token.usageCount !== undefined && (
                <div className={styles.tokenUsage}>Used {token.usageCount} times</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render border tokens
  const renderBorderTokens = () => {
    const gridClass = viewMode === 'grid' ? styles.borderTokensGrid : styles.borderTokensList;
    return (
      <div className={`${styles.borderTokens} ${gridClass}`}>
        {sortedTokens.map(token => {
          const borderWidth = token.properties?.width || '1px';
          const borderStyle = token.properties?.style || 'solid';
          const borderColor = token.properties?.color || '#000';
          const borderRadius = token.properties?.radius || '0';

          return (
            <div key={token.name} className={styles.tokenItem}>
              <div className={styles.borderPreview}>
                <div
                  className={styles.borderBox}
                  style={{
                    border: `${borderWidth} ${borderStyle} ${borderColor}`,
                    borderRadius
                  }}
                ></div>
              </div>
              <div className={styles.tokenDetails}>
                <div className={styles.tokenName}>{token.name}</div>
                <div className={styles.tokenProperties}>
                  <div>Width: {borderWidth}</div>
                  <div>Style: {borderStyle}</div>
                  <div>Color: {borderColor}</div>
                  <div>Radius: {borderRadius}</div>
                </div>
                {token.usageCount !== undefined && (
                  <div className={styles.tokenUsage}>Used {token.usageCount} times</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render content based on token type
  const renderContent = () => {
    switch (type) {
      case 'color':
        return renderColorTokens();
      case 'typography':
        return renderTypographyTokens();
      case 'spacing':
        return renderSpacingTokens();
      case 'border':
        return renderBorderTokens();
      default:
        return <div className={styles.noTokens}>No visualization available for this token type</div>;
    }
  };

  return (
    <div className={styles.visualizationPanel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>{type.charAt(0).toUpperCase() + type.slice(1)} Tokens</h3>
        <div className={styles.panelControls}>
          <div className={styles.controlGroup}>
            <label htmlFor="category-filter" className={styles.controlLabel}>Category:</label>
            <select
              id="category-filter"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={styles.controlSelect}
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

          <div className={styles.controlGroup}>
            <label htmlFor="sort-by" className={styles.controlLabel}>Sort by:</label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'usage' | 'value')}
              className={styles.controlSelect}
            >
              <option value="name">Name</option>
              <option value="usage">Usage Count</option>
              <option value="value">Value</option>
            </select>
          </div>

          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewButton} ${viewMode === 'grid' ? styles.viewButtonActive : ''}`}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
              className={`${styles.viewButton} ${viewMode === 'list' ? styles.viewButtonActive : ''}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
        </div>
      </div>

      <div className={styles.panelContent}>
        {tokens.length === 0 ? (
          <div className={styles.noTokens}>
            No {type} tokens found
          </div>
        ) : (
          renderContent()
        )}
      </div>


    </div>
  );
};

export default VisualizationPanel;
