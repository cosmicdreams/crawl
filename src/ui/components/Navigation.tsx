// src/ui/components/Navigation.tsx
import React from 'react';
import styles from './Navigation.module.css';

interface NavigationProps {
  /** The currently active page identifier */
  activePage: 'dashboard' | 'pipeline' | 'templates';
  /** Callback function when a navigation button is clicked */
  onNavigate: (page: 'dashboard' | 'pipeline' | 'templates') => void;
}

const Navigation: React.FC<NavigationProps> = ({ activePage, onNavigate }) => {
  const navItems: { id: 'dashboard' | 'pipeline' | 'templates'; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'pipeline', label: 'Pipeline Editor' },
    { id: 'templates', label: 'Templates' },
  ];

  return (
    <nav className={styles.navigation}>
      <ul className={styles.navList}>
        {navItems.map(item => (
          <li key={item.id} className={styles.navItem}>
            <button
              onClick={() => onNavigate(item.id)}
              className={activePage === item.id ? styles.navButtonActive : styles.navButton}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navigation;
