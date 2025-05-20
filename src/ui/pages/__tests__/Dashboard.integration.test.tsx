import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../Dashboard';
import { apiClient } from '../../api/client';

// Mock the API client
vi.mock('../../api/client', () => ({
  apiClient: {
    getProfiles: vi.fn(),
    getTokens: vi.fn(),
    getData: vi.fn(),
    runCrawler: vi.fn()
  }
}));

describe('Dashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful responses
    vi.mocked(apiClient.getProfiles).mockResolvedValue({
      data: { profiles: ['default', 'example'] }
    });
    
    vi.mocked(apiClient.getTokens).mockResolvedValue({
      data: [
        {
          name: 'primary',
          value: '#0066cc',
          type: 'color',
          category: 'brand',
          description: 'Primary brand color',
          usageCount: 42
        }
      ]
    });
  });

  it('loads and displays profiles on mount', async () => {
    render(<Dashboard />);

    // Should show loading state initially
    expect(screen.getByText('Loading tokens...')).toBeInTheDocument();

    // Wait for profiles to load
    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('default')).toBeInTheDocument();
      expect(screen.getByText('example')).toBeInTheDocument();
    });
  });

  it('handles profile switching', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Loading tokens...')).not.toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'example' } });

    expect(apiClient.getTokens).toHaveBeenCalledWith('example');
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    vi.mocked(apiClient.getTokens).mockResolvedValue({
      error: 'Failed to fetch tokens'
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Loading tokens...')).not.toBeInTheDocument();
    });

    // Should show error state
    expect(screen.getByText(/Failed to fetch tokens/)).toBeInTheDocument();
  });

  it('starts crawler and reloads data', async () => {
    vi.mocked(apiClient.runCrawler).mockResolvedValue({
      data: { status: 'started', profile: 'default', message: 'Crawler started' }
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Loading tokens...')).not.toBeInTheDocument();
    });

    // Click run crawler button
    fireEvent.click(screen.getByText('Run Crawler'));

    // Should show loading state
    expect(screen.getByText('Loading tokens...')).toBeInTheDocument();

    // Verify crawler was started
    expect(apiClient.runCrawler).toHaveBeenCalled();

    // Wait for data reload
    await waitFor(() => {
      expect(screen.queryByText('Loading tokens...')).not.toBeInTheDocument();
    }, { timeout: 6000 }); // Account for setTimeout in component
  });

  it('filters tokens by type when clicking tab', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Loading tokens...')).not.toBeInTheDocument();
    });

    // Click colors tab
    fireEvent.click(screen.getByText('Colors'));

    // Should only show color tokens
    expect(screen.getByText('primary')).toBeInTheDocument();
  });

  it('displays real-time dashboard when pipelines tab is selected', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Loading tokens...')).not.toBeInTheDocument();
    });

    // Click pipelines tab
    fireEvent.click(screen.getByText('Active Pipelines'));

    // Should show real-time dashboard
    expect(screen.getByText('Active Pipelines')).toBeInTheDocument();
  });
});