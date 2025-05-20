// src/ui/components/dashboard/TokenStatistics.tsx
import React from 'react';
import { DesignToken } from '../../../core/types.js';
import { ExtractedData } from '../../api/client.js';
import './TokenStatistics.css';

interface TokenStatisticsProps {
  tokens: DesignToken[];
  extractedData: ExtractedData | null;
}

const TokenStatistics: React.FC<TokenStatisticsProps> = ({ tokens = [], extractedData }) => {
  // Get tokens by type
  const getTokensByType = (type: string): DesignToken[] => {
    return (tokens || []).filter(token => token.type === type);
  };

  // Calculate token counts
  const colorTokens = getTokensByType('color');
  const typographyTokens = getTokensByType('typography');
  const spacingTokens = getTokensByType('spacing');
  const borderTokens = getTokensByType('border');
  const animationTokens = getTokensByType('animation');

  // Calculate percentages for the chart
  const totalTokens = tokens?.length || 0;
  const getPercentage = (count: number): number => {
    return totalTokens > 0 ? Math.round((count / totalTokens) * 100) : 0;
  };

  // Calculate consistency metrics
  const calculateConsistencyScore = (tokens: DesignToken[]): number => {
    if (tokens.length === 0) return 0;

    // A simple consistency score based on the ratio of tokens to usage count
    // Higher score means more consistent usage
    const uniqueValues = new Set(tokens.map(token => token.value)).size;
    return Math.min(100, Math.round((tokens.length / Math.max(1, uniqueValues)) * 100));
  };

  const colorConsistency = calculateConsistencyScore(colorTokens);
  const typographyConsistency = calculateConsistencyScore(typographyTokens);
  const spacingConsistency = calculateConsistencyScore(spacingTokens);
  const borderConsistency = calculateConsistencyScore(borderTokens);

  // Get crawl statistics
  const pagesCrawled = extractedData?.['crawl-results']?.length || 0;

  return (
    <div className="token-statistics">
      <div className="statistics-header">
        <h3>Token Statistics</h3>
        <div className="total-tokens">
          <span className="total-count">{totalTokens}</span> total tokens
        </div>
      </div>

      <div className="statistics-grid">
        <div className="stat-card">
          <div className="stat-header">
            <h4>Colors</h4>
            <span className="stat-count">{colorTokens.length}</span>
          </div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill color-bar"
              style={{ width: `${getPercentage(colorTokens.length)}%` }}
            ></div>
          </div>
          <div className="stat-details">
            <div className="stat-detail">
              <span className="detail-label">Consistency:</span>
              <span className="detail-value">{colorConsistency}%</span>
            </div>
            {colorTokens.length > 0 && (
              <div className="stat-detail">
                <span className="detail-label">Most used:</span>
                <span
                  className="color-preview"
                  style={{ backgroundColor: colorTokens[0].value }}
                ></span>
              </div>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h4>Typography</h4>
            <span className="stat-count">{typographyTokens.length}</span>
          </div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill typography-bar"
              style={{ width: `${getPercentage(typographyTokens.length)}%` }}
            ></div>
          </div>
          <div className="stat-details">
            <div className="stat-detail">
              <span className="detail-label">Consistency:</span>
              <span className="detail-value">{typographyConsistency}%</span>
            </div>
            <div className="stat-detail">
              <span className="detail-label">Font families:</span>
              <span className="detail-value">
                {new Set(typographyTokens
                  .filter(t => t.properties?.fontFamily)
                  .map(t => t.properties?.fontFamily)).size}
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h4>Spacing</h4>
            <span className="stat-count">{spacingTokens.length}</span>
          </div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill spacing-bar"
              style={{ width: `${getPercentage(spacingTokens.length)}%` }}
            ></div>
          </div>
          <div className="stat-details">
            <div className="stat-detail">
              <span className="detail-label">Consistency:</span>
              <span className="detail-value">{spacingConsistency}%</span>
            </div>
            <div className="stat-detail">
              <span className="detail-label">Units:</span>
              <span className="detail-value">
                {new Set(spacingTokens
                  .map(t => t.value.replace(/[0-9.]/g, '')))
                  .size}
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h4>Borders</h4>
            <span className="stat-count">{borderTokens.length}</span>
          </div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill border-bar"
              style={{ width: `${getPercentage(borderTokens.length)}%` }}
            ></div>
          </div>
          <div className="stat-details">
            <div className="stat-detail">
              <span className="detail-label">Consistency:</span>
              <span className="detail-value">{borderConsistency}%</span>
            </div>
            <div className="stat-detail">
              <span className="detail-label">Radius values:</span>
              <span className="detail-value">
                {new Set(borderTokens
                  .filter(t => t.properties?.radius)
                  .map(t => t.properties?.radius))
                  .size}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="crawl-statistics">
        <h3>Crawl Statistics</h3>
        <div className="crawl-stats-grid">
          <div className="crawl-stat">
            <span className="crawl-stat-label">Pages Crawled:</span>
            <span className="crawl-stat-value">{pagesCrawled}</span>
          </div>
          <div className="crawl-stat">
            <span className="crawl-stat-label">Elements Analyzed:</span>
            <span className="crawl-stat-value">
              {extractedData?.['element-count'] || 'N/A'}
            </span>
          </div>
          <div className="crawl-stat">
            <span className="crawl-stat-label">Extraction Time:</span>
            <span className="crawl-stat-value">
              {extractedData?.['extraction-time']
                ? `${Math.round(extractedData['extraction-time'] / 1000)}s`
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>


    </div>
  );
};

export default TokenStatistics;
