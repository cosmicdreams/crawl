// src/ui/components/TokenCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TokenCard from './TokenCard.js';
import { DesignToken } from '../../core/types.js';

describe('TokenCard', () => {
  it('renders a color token correctly', () => {
    const colorToken: DesignToken = {
      name: 'primary',
      value: '#0066cc',
      type: 'color',
      category: 'brand',
      description: 'Primary brand color',
      usageCount: 42
    };
    
    render(<TokenCard token={colorToken} />);
    
    expect(screen.getByText('primary')).toBeInTheDocument();
    expect(screen.getByText('#0066cc')).toBeInTheDocument();
    expect(screen.getByText('brand')).toBeInTheDocument();
    expect(screen.getByText('Used 42 times')).toBeInTheDocument();
  });
  
  it('renders a typography token correctly', () => {
    const typographyToken: DesignToken = {
      name: 'heading-1',
      value: 'font-family: Inter; font-size: 2.5rem; font-weight: 700; line-height: 1.2;',
      type: 'typography',
      category: 'heading',
      description: 'Main heading style',
      usageCount: 15
    };
    
    render(<TokenCard token={typographyToken} />);
    
    expect(screen.getByText('heading-1')).toBeInTheDocument();
    expect(screen.getByText(/font-family: Inter/)).toBeInTheDocument();
    expect(screen.getByText('heading')).toBeInTheDocument();
    expect(screen.getByText('Used 15 times')).toBeInTheDocument();
    expect(screen.getByText('The quick brown fox jumps over the lazy dog')).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', () => {
    const colorToken: DesignToken = {
      name: 'primary',
      value: '#0066cc',
      type: 'color',
      category: 'brand'
    };
    
    const handleClick = vi.fn();
    
    render(<TokenCard token={colorToken} onClick={handleClick} />);
    
    fireEvent.click(screen.getByText('primary'));
    
    expect(handleClick).toHaveBeenCalledWith(colorToken);
  });
});
