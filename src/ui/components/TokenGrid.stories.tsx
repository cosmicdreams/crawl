// src/ui/components/TokenGrid.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import TokenGrid from './TokenGrid';
import { DesignToken } from '../../core/types.js';

const meta = {
  title: 'Components/TokenGrid',
  component: TokenGrid,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TokenGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample tokens for the story
const sampleTokens: DesignToken[] = [
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
    name: 'body-regular',
    value: 'font-family: Inter; font-size: 1rem; font-weight: 400; line-height: 1.5;',
    type: 'typography',
    category: 'body',
    description: 'Regular body text',
    usageCount: 156
  },
  
  // Spacing
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
    name: 'border-width-1',
    value: '1px',
    type: 'border',
    category: 'width',
    description: 'Standard border width',
    usageCount: 156
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

export const Default: Story = {
  args: {
    tokens: sampleTokens,
    title: 'Design Tokens'
  },
};

export const FilteredByType: Story = {
  args: {
    tokens: sampleTokens,
    title: 'Color Tokens',
    filter: {
      types: ['color']
    }
  },
};

export const FilteredByCategory: Story = {
  args: {
    tokens: sampleTokens,
    title: 'Brand Tokens',
    filter: {
      categories: ['brand']
    }
  },
};

export const WithSearch: Story = {
  args: {
    tokens: sampleTokens,
    title: 'Search Results',
    filter: {
      search: 'primary'
    }
  },
};
