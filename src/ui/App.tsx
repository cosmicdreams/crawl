// src/ui/App.tsx
import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import PipelineEditor from './pages/PipelineEditor';
import TemplatesPage from './pages/TemplatesPage';
import Navigation from './components/Navigation';
import { ErrorBoundary } from './components/ErrorBoundary';
import styles from './App.module.css';

/**
 * The main application component that handles page navigation and layout.
 */
const App: React.FC = () => {
  const [activePage, setActivePage] = useState<'dashboard' | 'pipeline' | 'templates'>('dashboard');
  const [activeProfile, setActiveProfile] = useState<string>(() => {
    // Retrieve the last selected profile from localStorage or default to 'example'
    return localStorage.getItem('activeProfile') || 'example';
  });

  useEffect(() => {
    // Save the active profile to localStorage whenever it changes
    localStorage.setItem('activeProfile', activeProfile);
  }, [activeProfile]);

  const handleProfileChange = (profile: string) => {
    setActiveProfile(profile);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard initialProfile={activeProfile} />;
      case 'pipeline':
        return <PipelineEditor initialProfile={activeProfile} />;
      case 'templates':
        return (
          <TemplatesPage
            onProfileCreated={(profileName) => {
              setActiveProfile(profileName);
              setActivePage('dashboard');
            }}
          />
        );
      default:
        return <Dashboard initialProfile={activeProfile} />;
    }
  };

  return (
    <div className={styles.appContainer}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Design Token Crawler</h1>
        <div className={styles.headerControls}>
          <select
            value={activeProfile}
            onChange={(e) => handleProfileChange(e.target.value)}
            className={styles.profileSelect}
          >
            <option value="default">default</option>
            <option value="example">example</option>
            <option value="local">local</option>
            <option value="pncb">pncb</option>
          </select>
        </div>
      </header>

      <Navigation
        activePage={activePage}
        onNavigate={(page) => setActivePage(page as 'dashboard' | 'pipeline' | 'templates')}
      />

      <ErrorBoundary>
        <div className={styles.pageContent}>
          {renderPage()}
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default App;
