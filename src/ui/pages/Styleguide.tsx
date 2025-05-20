// src/ui/pages/Styleguide.tsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { DesignToken } from '../../core/types.js';
import { logger } from '../../utils/logger.js';

// Token visualization components
import ColorTokens from '../components/styleguide/ColorTokens';
import TypographyTokens from '../components/styleguide/TypographyTokens';
import SpacingTokens from '../components/styleguide/SpacingTokens';
import BorderTokens from '../components/styleguide/BorderTokens';
import AnimationTokens from '../components/styleguide/AnimationTokens';

interface StyleguideProps {
  profileName?: string;
}

const Styleguide: React.FC<StyleguideProps> = ({ profileName = 'default' }) => {
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>(profileName);
  const [profiles, setProfiles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'spacing' | 'borders' | 'animations'>('colors');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load profiles
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const response = await apiClient.getProfiles();
        if (response.data) {
          setProfiles(response.data.profiles);
        } else if (response.error) {
          logger.error('Failed to load profiles', { error: response.error });
        }
      } catch (err) {
        logger.error('Error loading profiles', { error: err });
      }
    };

    loadProfiles();
  }, []);

  // Load tokens for the active profile
  useEffect(() => {
    const loadTokens = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.getTokens(activeProfile);
        if (response.data) {
          setTokens(response.data);
        } else if (response.error) {
          setError(`Failed to load tokens: ${response.error}`);
          logger.error('Failed to load tokens', { error: response.error });
        }
      } catch (err) {
        setError('An error occurred while loading tokens');
        logger.error('Error loading tokens', { error: err });
      } finally {
        setLoading(false);
      }
    };

    loadTokens();
  }, [activeProfile]);

  // Handle profile change
  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveProfile(e.target.value);
  };

  // Filter tokens by type
  const getTokensByType = (type: string): DesignToken[] => {
    return tokens.filter(token => token.type === type);
  };

  return (
    <div className="styleguide">
      <header className="styleguide-header">
        <h1>Design System Styleguide</h1>
        <div className="profile-selector">
          <label htmlFor="profile-select">Profile:</label>
          <select
            id="profile-select"
            value={activeProfile}
            onChange={handleProfileChange}
            disabled={loading}
          >
            {profiles.map(profile => (
              <option key={profile} value={profile}>{profile}</option>
            ))}
          </select>
        </div>
      </header>

      <nav className="styleguide-nav">
        <ul>
          <li>
            <button
              className={activeTab === 'colors' ? 'active' : ''}
              onClick={() => setActiveTab('colors')}
            >
              Colors
            </button>
          </li>
          <li>
            <button
              className={activeTab === 'typography' ? 'active' : ''}
              onClick={() => setActiveTab('typography')}
            >
              Typography
            </button>
          </li>
          <li>
            <button
              className={activeTab === 'spacing' ? 'active' : ''}
              onClick={() => setActiveTab('spacing')}
            >
              Spacing
            </button>
          </li>
          <li>
            <button
              className={activeTab === 'borders' ? 'active' : ''}
              onClick={() => setActiveTab('borders')}
            >
              Borders
            </button>
          </li>
          <li>
            <button
              className={activeTab === 'animations' ? 'active' : ''}
              onClick={() => setActiveTab('animations')}
            >
              Animations
            </button>
          </li>
        </ul>
      </nav>

      <main className="styleguide-content">
        {loading ? (
          <div className="loading">Loading tokens...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : tokens.length === 0 ? (
          <div className="empty-state">
            <p>No tokens found for this profile.</p>
            <p>Run a crawler to extract design tokens first.</p>
          </div>
        ) : (
          <div className="token-display">
            {activeTab === 'colors' && (
              <ColorTokens tokens={getTokensByType('color')} />
            )}
            {activeTab === 'typography' && (
              <TypographyTokens tokens={getTokensByType('typography')} />
            )}
            {activeTab === 'spacing' && (
              <SpacingTokens tokens={getTokensByType('spacing')} />
            )}
            {activeTab === 'borders' && (
              <BorderTokens tokens={getTokensByType('border')} />
            )}
            {activeTab === 'animations' && (
              <AnimationTokens tokens={getTokensByType('animation')} />
            )}
          </div>
        )}
      </main>

      <style jsx>{`
        .styleguide {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .styleguide-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .styleguide-header h1 {
          margin: 0;
          font-size: 2rem;
          color: #333;
        }

        .profile-selector {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .profile-selector select {
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          background-color: white;
          font-size: 1rem;
        }

        .styleguide-nav {
          margin-bottom: 30px;
          border-bottom: 1px solid #dee2e6;
        }

        .styleguide-nav ul {
          display: flex;
          list-style: none;
          padding: 0;
          margin: 0;
          gap: 5px;
        }

        .styleguide-nav button {
          padding: 10px 20px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 1rem;
          color: #495057;
          transition: all 0.2s;
        }

        .styleguide-nav button:hover {
          color: #0066cc;
        }

        .styleguide-nav button.active {
          color: #0066cc;
          border-bottom-color: #0066cc;
          font-weight: 500;
        }

        .styleguide-content {
          min-height: 500px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          padding: 30px;
        }

        .loading, .error, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          text-align: center;
          color: #6c757d;
        }

        .error {
          color: #dc3545;
        }

        .token-display {
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default Styleguide;
