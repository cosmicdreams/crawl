// src/ui/components/TokenGrid.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TokenGrid from './TokenGrid.js';
import { DesignToken } from '../../core/types.js';

describe('TokenGrid', () => {
  const sampleTokens: DesignToken[] = [
    {
      name: 'primary',
      value: '#0066cc',
      type: 'color',
      category: 'brand',
      usageCount: 42
    },
    {
      name: 'secondary',
      value: '#ff9900',
      type: 'color',
      category: 'brand',
      usageCount: 28
    },
    {
      name: 'heading-1',
      value: 'font-family: Inter; font-size: 2.5rem; font-weight: 700; line-height: 1.2;',
      type: 'typography',
      category: 'heading',
      usageCount: 15
    }
  ];

  it('renders the title correctly', () => {
    render(<TokenGrid tokens={sampleTokens} title="Test Tokens" />);
    expect(screen.getByText('Test Tokens')).toBeInTheDocument();
  });

  it('renders all tokens by default', () => {
    render(<TokenGrid tokens={sampleTokens} />);
    expect(screen.getByText('primary')).toBeInTheDocument();
    expect(screen.getByText('secondary')).toBeInTheDocument();
    expect(screen.getByText('heading-1')).toBeInTheDocument();
  });

  it('filters tokens by type', () => {
    render(<TokenGrid tokens={sampleTokens} />);

    // Click the 'color' type filter
    fireEvent.click(screen.getByText('color'));

    // Should show color tokens but not typography
    expect(screen.getByText('primary')).toBeInTheDocument();
    expect(screen.getByText('secondary')).toBeInTheDocument();
    expect(screen.queryByText('heading-1')).not.toBeInTheDocument();
  });

  it('filters tokens by category', () => {
    render(<TokenGrid tokens={sampleTokens} />);

    // Click the 'heading' category filter button
    const headingButtons = screen.getAllByText('heading');
    // The first one should be the button, not the category label
    const headingFilterButton = headingButtons.find(el => el.tagName.toLowerCase() === 'button');
    fireEvent.click(headingFilterButton);

    // Should show heading tokens but not brand
    expect(screen.queryByText('primary')).not.toBeInTheDocument();
    expect(screen.queryByText('secondary')).not.toBeInTheDocument();
    expect(screen.getByText('heading-1')).toBeInTheDocument();
  });

  it('filters tokens by search term', () => {
    render(<TokenGrid tokens={sampleTokens} />);

    // Search for 'primary'
    fireEvent.change(screen.getByPlaceholderText('Search tokens...'), { target: { value: 'primary' } });

    // Should show primary but not secondary or heading-1
    expect(screen.getByText('primary')).toBeInTheDocument();
    expect(screen.queryByText('secondary')).not.toBeInTheDocument();
    expect(screen.queryByText('heading-1')).not.toBeInTheDocument();
  });

  it('clears filters when clear button is clicked', () => {
    render(<TokenGrid tokens={sampleTokens} />);

    // Apply a filter
    fireEvent.click(screen.getByText('color'));

    // Verify filter is applied
    expect(screen.queryByText('heading-1')).not.toBeInTheDocument();

    // Clear filters
    fireEvent.click(screen.getByText('Clear Filters'));

    // All tokens should be visible again
    expect(screen.getByText('primary')).toBeInTheDocument();
    expect(screen.getByText('secondary')).toBeInTheDocument();
    expect(screen.getByText('heading-1')).toBeInTheDocument();
  });

  it('calls onTokenClick when a token is clicked', () => {
    const handleTokenClick = vi.fn();
    render(<TokenGrid tokens={sampleTokens} onTokenClick={handleTokenClick} />);

    fireEvent.click(screen.getByText('primary'));

    expect(handleTokenClick).toHaveBeenCalledWith(sampleTokens[0]);
  });
});
