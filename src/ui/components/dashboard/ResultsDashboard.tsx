// src/ui/components/dashboard/ResultsDashboard.tsx
import React, { useState, useEffect } from 'react';
import { DesignToken } from '../../../core/types.js';
import { apiClient } from '../../api/client.js';
import { ExtractedData } from '../../api/client.js';
import TokenStatistics from './TokenStatistics';
import VisualizationPanel from './VisualizationPanel';
import { logger } from '../../../utils/logger.js';
import './ResultsDashboard.css';

interface ResultsDashboardProps {
  profileName: string;
  refreshInterval?: number;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  profileName,
  refreshInterval = 10000
}) => {
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'colors' | 'typography' | 'spacing' | 'borders'>('overview');
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Fetch data for the profile
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch tokens
      const tokensResponse = await apiClient.getTokens(profileName);
      if (tokensResponse.data) {
        setTokens(tokensResponse.data);
      } else if (tokensResponse.error) {
        logger.error('Failed to fetch tokens', { error: tokensResponse.error });
      }

      // Fetch extracted data
      const dataResponse = await apiClient.getData(profileName);
      if (dataResponse.data) {
        setExtractedData(dataResponse.data);
      } else if (dataResponse.error) {
        logger.error('Failed to fetch extracted data', { error: dataResponse.error });
      }

      setLastRefresh(Date.now());
    } catch (err) {
      setError('Failed to fetch data');
      logger.error('Error fetching dashboard data', { error: err });
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();

    // Set up polling interval
    const interval = setInterval(fetchData, refreshInterval);

    return () => clearInterval(interval);
  }, [profileName, refreshInterval]);

  // Calculate time since last update
  const getTimeSinceUpdate = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) {
      return `${seconds} seconds ago`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} minutes ago`;
    } else {
      return `${Math.floor(seconds / 3600)} hours ago`;
    }
  };

  // Get tokens by type with null check
  const getTokensByType = (type: string): DesignToken[] => {
    return (tokens || []).filter(token => token.type === type);
  };

  // Get token counts with null check
  const getTokenCounts = () => {
    const counts = {
      colors: getTokensByType('color').length,
      typography: getTokensByType('typography').length,
      spacing: getTokensByType('spacing').length,
      borders: getTokensByType('border').length,
      animations: getTokensByType('animation').length,
      total: tokens?.length || 0
    };

    return counts;
  };

  return (
    <div className="results-dashboard">
      <div className="dashboard-header">
        <h2>Results Dashboard: {profileName}</h2>
        <div className="refresh-info">
          Last refreshed: {getTimeSinceUpdate(lastRefresh)}
          <button
            onClick={fetchData}
            disabled={loading}
            className="refresh-button"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'colors' ? 'active' : ''}`}
          onClick={() => setActiveTab('colors')}
        >
          Colors
        </button>
        <button
          className={`tab-button ${activeTab === 'typography' ? 'active' : ''}`}
          onClick={() => setActiveTab('typography')}
        >
          Typography
        </button>
        <button
          className={`tab-button ${activeTab === 'spacing' ? 'active' : ''}`}
          onClick={() => setActiveTab('spacing')}
        >
          Spacing
        </button>
        <button
          className={`tab-button ${activeTab === 'borders' ? 'active' : ''}`}
          onClick={() => setActiveTab('borders')}
        >
          Borders
        </button>
      </div>

      {loading && !tokens.length ? (
        <div className="loading">
          Loading results...
        </div>
      ) : tokens.length === 0 ? (
        <div className="no-data">
          No tokens found for this profile. Run a crawler to extract design tokens.
        </div>
      ) : (
        <div className="dashboard-content">
          {activeTab === 'overview' && (
            <div className="overview-panel">
              <TokenStatistics
                tokens={tokens}
                extractedData={extractedData}
              />
              <div className="export-options">
                <h3>Export Options</h3>
                <div className="export-buttons">
                  <button
                    className="export-button"
                    onClick={() => window.open(`/api/export/${profileName}/css`, '_blank')}
                  >
                    Export as CSS
                  </button>
                  <button
                    className="export-button"
                    onClick={() => window.open(`/api/export/${profileName}/json`, '_blank')}
                  >
                    Export as JSON
                  </button>
                  <button
                    className="export-button"
                    onClick={() => window.open(`/api/export/${profileName}/figma`, '_blank')}
                  >
                    Export for Figma
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'colors' && (
            <VisualizationPanel
              type="color"
              tokens={getTokensByType('color')}
              extractedData={extractedData}
            />
          )}

          {activeTab === 'typography' && (
            <VisualizationPanel
              type="typography"
              tokens={getTokensByType('typography')}
              extractedData={extractedData}
            />
          )}

          {activeTab === 'spacing' && (
            <VisualizationPanel
              type="spacing"
              tokens={getTokensByType('spacing')}
              extractedData={extractedData}
            />
          )}

          {activeTab === 'borders' && (
            <VisualizationPanel
              type="border"
              tokens={getTokensByType('border')}
              extractedData={extractedData}
            />
          )}
        </div>
      )}


    </div>
  );
};

export default ResultsDashboard;
