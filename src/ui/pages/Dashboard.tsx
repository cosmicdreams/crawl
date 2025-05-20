// src/ui/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import TokenGrid from '../components/TokenGrid.js';
import { DesignToken } from '../../core/types.js';
import { apiClient } from '../api/client.js';
import { ExtractedData, ProfileData, RunOptions } from '../api/client.js';
import RealTimeDashboard from '../components/dashboard/RealTimeDashboard';
import ResultsDashboard from '../components/dashboard/ResultsDashboard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import styles from './Dashboard.module.css';

interface DashboardProps {
  initialProfile?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ initialProfile = 'default' }) => {
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'colors' | 'typography' | 'spacing' | 'borders' | 'pipelines' | 'results'>('all');
  const [profiles, setProfiles] = useState<string[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>(initialProfile);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [runOptions, setRunOptions] = useState<RunOptions>({
    maxPages: 5,
    extractors: ['colors', 'typography', 'spacing', 'borders'],
    generateTokens: true
  });

  // Load available profiles
  useEffect(() => {
    const loadProfiles = async () => {
      const response = await apiClient.getProfiles();
      if (response.data) {
        setProfiles(response.data.profiles);
      } else if (response.error) {
        setError(`Failed to load profiles: ${response.error}`);
      }
    };

    loadProfiles();
  }, []);

  // Load tokens for the active profile
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load tokens
        const tokensResponse = await apiClient.getTokens(activeProfile);
        if (tokensResponse.data) {
          // Handle both array and object response formats
          const tokenData = tokensResponse.data;
          if (Array.isArray(tokenData)) {
            setTokens(tokenData);
          } else if (typeof tokenData === 'object' && tokenData !== null) {
            // Convert object format to array
            const tokenArray: DesignToken[] = [];
            (Object.entries(tokenData) as [string, Record<string, any>][]).forEach(([type, tokens]) => {
              if (typeof tokens === 'object' && tokens !== null) {
                Object.entries(tokens).forEach(([name, data]) => {
                  tokenArray.push({
                    name,
                    type: type as 'typography' | 'spacing' | 'color' | 'border' | 'animation',
                    value: data.value,
                    category: data.category,
                    description: data.description,
                    usageCount: data.usageCount
                  });
                });
              }
            });
            setTokens(tokenArray);
          }
        } else if (tokensResponse.error) {
          console.warn(`Failed to load tokens: ${tokensResponse.error}`);
          // If we can't load tokens, try to load extracted data
          const dataResponse = await apiClient.getData(activeProfile);
          if (dataResponse.data) {
            setExtractedData(dataResponse.data);

            // Combine all tokens from the extracted data
            const allTokens: DesignToken[] = [];
            if (dataResponse.data['color-analysis']) {
              allTokens.push(...dataResponse.data['color-analysis']);
            }
            if (dataResponse.data['typography-analysis']) {
              allTokens.push(...dataResponse.data['typography-analysis']);
            }
            if (dataResponse.data['spacing-analysis']) {
              allTokens.push(...dataResponse.data['spacing-analysis']);
            }
            if (dataResponse.data['border-analysis']) {
              allTokens.push(...dataResponse.data['border-analysis']);
            }

            setTokens(allTokens);
          } else {
            // If we can't load extracted data either, use mock data
            const mockTokens: DesignToken[] = [
              // Colors
              {
                name: 'primary',
                value: '#0066cc',
                type: 'color',
                category: 'brand',
                description: 'Primary brand color',
                usageCount: 42
              },
              {
                name: 'secondary',
                value: '#ff9900',
                type: 'color',
                category: 'brand',
                description: 'Secondary brand color',
                usageCount: 28
              },
              {
                name: 'success',
                value: '#28a745',
                type: 'color',
                category: 'feedback',
                description: 'Success color',
                usageCount: 15
              },
              {
                name: 'error',
                value: '#dc3545',
                type: 'color',
                category: 'feedback',
                description: 'Error color',
                usageCount: 8
              },
              {
                name: 'text-primary',
                value: '#212529',
                type: 'color',
                category: 'text',
                description: 'Primary text color',
                usageCount: 120
              },
              {
                name: 'text-secondary',
                value: '#6c757d',
                type: 'color',
                category: 'text',
                description: 'Secondary text color',
                usageCount: 85
              },
              {
                name: 'background',
                value: '#ffffff',
                type: 'color',
                category: 'background',
                description: 'Background color',
                usageCount: 150
              },
              {
                name: 'background-alt',
                value: '#f8f9fa',
                type: 'color',
                category: 'background',
                description: 'Alternative background color',
                usageCount: 65
              },
              {
                name: 'border',
                value: '#dee2e6',
                type: 'color',
                category: 'border',
                description: 'Border color',
                usageCount: 92
              },

              // Typography
              {
                name: 'heading-1',
                value: 'font-family: Inter; font-size: 2.5rem; font-weight: 700; line-height: 1.2;',
                type: 'typography',
                category: 'heading',
                description: 'Main heading style',
                usageCount: 15
              },
              {
                name: 'heading-2',
                value: 'font-family: Inter; font-size: 2rem; font-weight: 700; line-height: 1.2;',
                type: 'typography',
                category: 'heading',
                description: 'Secondary heading style',
                usageCount: 28
              },
              {
                name: 'heading-3',
                value: 'font-family: Inter; font-size: 1.75rem; font-weight: 600; line-height: 1.3;',
                type: 'typography',
                category: 'heading',
                description: 'Tertiary heading style',
                usageCount: 42
              },
              {
                name: 'body-regular',
                value: 'font-family: Inter; font-size: 1rem; font-weight: 400; line-height: 1.5;',
                type: 'typography',
                category: 'body',
                description: 'Regular body text',
                usageCount: 156
              },
              {
                name: 'body-small',
                value: 'font-family: Inter; font-size: 0.875rem; font-weight: 400; line-height: 1.5;',
                type: 'typography',
                category: 'body',
                description: 'Small body text',
                usageCount: 92
              },

              // Spacing
              {
                name: 'spacing-0',
                value: '0',
                type: 'spacing',
                category: 'base',
                description: 'Zero spacing',
                usageCount: 120
              },
              {
                name: 'spacing-1',
                value: '0.25rem',
                type: 'spacing',
                category: 'base',
                description: 'Extra small spacing',
                usageCount: 85
              },
              {
                name: 'spacing-2',
                value: '0.5rem',
                type: 'spacing',
                category: 'base',
                description: 'Small spacing',
                usageCount: 156
              },
              {
                name: 'spacing-4',
                value: '1rem',
                type: 'spacing',
                category: 'base',
                description: 'Base spacing unit',
                usageCount: 210
              },
              {
                name: 'spacing-8',
                value: '2rem',
                type: 'spacing',
                category: 'base',
                description: 'Large spacing',
                usageCount: 42
              },

              // Borders
              {
                name: 'border-width-0',
                value: '0',
                type: 'border',
                category: 'width',
                description: 'No border',
                usageCount: 85
              },
              {
                name: 'border-width-1',
                value: '1px',
                type: 'border',
                category: 'width',
                description: 'Standard border width',
                usageCount: 156
              },
              {
                name: 'border-radius-0',
                value: '0',
                type: 'border',
                category: 'radius',
                description: 'No border radius',
                usageCount: 120
              },
              {
                name: 'border-radius-sm',
                value: '0.25rem',
                type: 'border',
                category: 'radius',
                description: 'Small border radius',
                usageCount: 92
              },
              {
                name: 'border-radius-md',
                value: '0.5rem',
                type: 'border',
                category: 'radius',
                description: 'Medium border radius',
                usageCount: 78
              },
              {
                name: 'shadow-none',
                value: 'none',
                type: 'border',
                category: 'shadow',
                description: 'No shadow',
                usageCount: 64
              },
              {
                name: 'shadow-sm',
                value: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                type: 'border',
                category: 'shadow',
                description: 'Small shadow',
                usageCount: 48
              },
              {
                name: 'shadow-md',
                value: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                type: 'border',
                category: 'shadow',
                description: 'Medium shadow',
                usageCount: 36
              }
            ];

            setTokens(mockTokens);
          }
        }
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeProfile]);

  const getFilterForTab = () => {
    switch (activeTab) {
      case 'colors':
        return { types: ['color'] };
      case 'typography':
        return { types: ['typography'] };
      case 'spacing':
        return { types: ['spacing'] };
      case 'borders':
        return { types: ['border'] };
      default:
        return {};
    }
  };

  const handleTokenClick = (token: DesignToken) => {
    console.log('Token clicked:', token);
    // In a real implementation, this could show a modal with token details
  };

  // Run the crawler for the active profile
  const handleRunCrawler = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.runCrawler(activeProfile, runOptions);
      if (response.data) {
        console.log('Crawler started:', response.data);
        // In a real implementation, we would poll for status updates
        // For now, we'll just wait a bit and then reload the data
        setTimeout(() => {
          // Reload data after the crawler finishes
          const loadData = async () => {
            const dataResponse = await apiClient.getData(activeProfile);
            if (dataResponse.data) {
              setExtractedData(dataResponse.data);
            }
          };
          loadData();
          setLoading(false);
        }, 5000);
      } else if (response.error) {
        setError(`Failed to run crawler: ${response.error}`);
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to run crawler');
      setLoading(false);
    }
  };

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Design Token Crawler</h1>

        <div className={styles.headerControls}>
          <select
            value={activeProfile}
            onChange={(e) => setActiveProfile(e.target.value)}
            className={styles.profileSelect}
          >
            {profiles.map(profile => (
              <option key={profile} value={profile}>{profile}</option>
            ))}
          </select>

          <button
            onClick={handleRunCrawler}
            className={styles.runButton}
          >
            Run Crawler
          </button>
        </div>
      </header>

      <nav className={styles.navigation}>
        <ul className={styles.navList}>
          {[
            { id: 'all', label: 'All Tokens' },
            { id: 'results', label: 'Results Dashboard' },
            { id: 'pipelines', label: 'Active Pipelines' },
            { id: 'colors', label: 'Colors' },
            { id: 'typography', label: 'Typography' },
            { id: 'spacing', label: 'Spacing' },
            { id: 'borders', label: 'Borders' }
          ].map(tab => (
            <li key={tab.id}>
              <button
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={activeTab === tab.id ? styles.navButtonActive : styles.navButton}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <ErrorBoundary>
        <main>
          {activeTab === 'pipelines' ? (
            <div className={styles.contentSection}>
              <ErrorBoundary>
                <RealTimeDashboard refreshInterval={5000} />
              </ErrorBoundary>
            </div>
          ) : activeTab === 'results' ? (
            <div className={styles.contentSection}>
              <ErrorBoundary>
                <ResultsDashboard profileName={activeProfile} refreshInterval={10000} />
              </ErrorBoundary>
            </div>
          ) : loading ? (
            <div className={styles.loadingState}>
              Loading tokens...
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              {error}
            </div>
          ) : (
            <ErrorBoundary>
              <TokenGrid
                tokens={tokens}
                title={`${activeTab === 'all' ? 'All' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Tokens`}
                onTokenClick={handleTokenClick}
                filter={getFilterForTab()}
              />
            </ErrorBoundary>
          )}
        </main>
      </ErrorBoundary>
    </div>
  );
};

export default Dashboard;
