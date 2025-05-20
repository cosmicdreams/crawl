// src/ui/pages/Dashboard.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Dashboard from './Dashboard.js';
import { apiClient } from '../api/client.js';

// Mock the API client
vi.mock('../api/client.js', () => ({
  apiClient: {
    getProfiles: vi.fn().mockResolvedValue({
      data: { profiles: ['default', 'example'] }
    }),
    getTokens: vi.fn().mockResolvedValue({
      data: [
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
          name: 'heading-1',
          value: 'font-family: Inter; font-size: 2.5rem; font-weight: 700; line-height: 1.2;',
          type: 'typography',
          category: 'heading',
          description: 'Main heading style',
          usageCount: 15
        }
      ]
    })
  }
}));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    render(<Dashboard />);
    expect(screen.getByText('Loading tokens...')).toBeInTheDocument();
  });

  it('displays tokens after loading', async () => {
    // Mock the API response
    vi.mocked(apiClient.getTokens).mockResolvedValueOnce({
      data: [
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
        }
      ]
    });

    render(<Dashboard />);

    // Initially shows loading state
    expect(screen.getByText('Loading tokens...')).toBeInTheDocument();

    // Wait for the API call to resolve and component to update
    await waitFor(() => {
      expect(screen.queryByText('Loading tokens...')).not.toBeInTheDocument();
    });

    // Check if tokens are displayed - use a more specific selector
    expect(screen.getByRole('heading', { name: 'All Tokens' })).toBeInTheDocument();

    // Check for token names
    expect(screen.getByText('primary')).toBeInTheDocument();
    expect(screen.getByText('secondary')).toBeInTheDocument();
  });

  it('filters tokens when tabs are clicked', async () => {
    // Mock the API response
    vi.mocked(apiClient.getTokens).mockResolvedValueOnce({
      data: [
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
          name: 'heading-1',
          value: 'font-family: Inter; font-size: 2.5rem; font-weight: 700; line-height: 1.2;',
          type: 'typography',
          category: 'heading',
          description: 'Main heading style',
          usageCount: 15
        }
      ]
    });

    render(<Dashboard />);

    // Wait for the API call to resolve and component to update
    await waitFor(() => {
      expect(screen.queryByText('Loading tokens...')).not.toBeInTheDocument();
    });

    // Check if tokens are displayed - use a more specific selector
    expect(screen.getByRole('heading', { name: 'All Tokens' })).toBeInTheDocument();

    // Click on the Colors tab
    fireEvent.click(screen.getByText('Colors'));

    // Wait for the component to update
    await waitFor(() => {
      // Should show color tokens
      expect(screen.getByText('primary')).toBeInTheDocument();
      expect(screen.getByText('secondary')).toBeInTheDocument();
    });

    // Click on the Typography tab
    fireEvent.click(screen.getByText('Typography'));

    // Wait for the component to update
    await waitFor(() => {
      // Should show typography tokens
      expect(screen.getByText('heading-1')).toBeInTheDocument();
    });
  });
});
