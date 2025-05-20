import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import TokenGrid from '../TokenGrid';
import type { DesignToken } from '../../../core/types';

describe('TokenGrid Integration', () => {
  const mockTokens: DesignToken[] = [
    {
      name: 'primary',
      value: '#0066cc',
      type: 'color',
      category: 'brand',
      description: 'Primary brand color',
      usageCount: 42
    },
    {
      name: 'heading-1',
      value: 'font-family: Inter; font-size: 2.5rem',
      type: 'typography',
      category: 'heading',
      description: 'Main heading',
      usageCount: 15
    }
  ];

  it('filters and displays tokens correctly', async () => {
    const handleTokenClick = vi.fn();
    render(
      <TokenGrid
        tokens={mockTokens}
        onTokenClick={handleTokenClick}
      />
    );

    // Initially shows all tokens
    expect(screen.getByText('primary')).toBeInTheDocument();
    expect(screen.getByText('heading-1')).toBeInTheDocument();

    // Filter by type
    const colorButton = screen.getByText('color');
    fireEvent.click(colorButton);

    await waitFor(() => {
      expect(screen.getByText('primary')).toBeInTheDocument();
      expect(screen.queryByText('heading-1')).not.toBeInTheDocument();
    });

    // Clear filters
    fireEvent.click(screen.getByText('Clear Filters'));

    await waitFor(() => {
      expect(screen.getByText('primary')).toBeInTheDocument();
      expect(screen.getByText('heading-1')).toBeInTheDocument();
    });

    // Search functionality
    const searchInput = screen.getByPlaceholderText('Search tokens...');
    fireEvent.change(searchInput, { target: { value: 'primary' } });

    await waitFor(() => {
      expect(screen.getByText('primary')).toBeInTheDocument();
      expect(screen.queryByText('heading-1')).not.toBeInTheDocument();
    });
  });

  it('handles token click events', async () => {
    const handleTokenClick = vi.fn();
    render(
      <TokenGrid
        tokens={mockTokens}
        onTokenClick={handleTokenClick}
      />
    );

    const tokenCard = screen.getByText('primary').closest('div');
    fireEvent.click(tokenCard!);

    expect(handleTokenClick).toHaveBeenCalledWith(mockTokens[0]);
  });

  it('handles empty token list gracefully', () => {
    render(<TokenGrid tokens={[]} />);
    expect(screen.getByText('0 tokens found')).toBeInTheDocument();
  });

  it('maintains filter state across updates', async () => {
    const { rerender } = render(
      <TokenGrid
        tokens={mockTokens}
        filter={{ types: ['color'] }}
      />
    );

    expect(screen.getByText('primary')).toBeInTheDocument();
    expect(screen.queryByText('heading-1')).not.toBeInTheDocument();

    // Update with new tokens
    const newTokens = [
      ...mockTokens,
      {
        name: 'secondary',
        value: '#ff0000',
        type: 'color',
        category: 'brand',
        usageCount: 20
      }
    ];

    rerender(<TokenGrid tokens={newTokens} filter={{ types: ['color'] }} />);

    await waitFor(() => {
      expect(screen.getByText('primary')).toBeInTheDocument();
      expect(screen.getByText('secondary')).toBeInTheDocument();
      expect(screen.queryByText('heading-1')).not.toBeInTheDocument();
    });
  });
});