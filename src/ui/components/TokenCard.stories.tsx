// src/ui/components/TokenCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import TokenCard from './TokenCard';

const meta = {
  title: 'Components/TokenCard',
  component: TokenCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TokenCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ColorToken: Story = {
  args: {
    token: {
      name: 'primary',
      value: '#0066cc',
      type: 'color',
      category: 'brand',
      description: 'Primary brand color',
      usageCount: 42
    },
  },
};

export const TypographyToken: Story = {
  args: {
    token: {
      name: 'heading-1',
      value: 'font-family: Inter; font-size: 2.5rem; font-weight: 700; line-height: 1.2;',
      type: 'typography',
      category: 'heading',
      description: 'Main heading style',
      usageCount: 15
    },
  },
};

export const SpacingToken: Story = {
  args: {
    token: {
      name: 'spacing-4',
      value: '1rem',
      type: 'spacing',
      category: 'base',
      description: 'Base spacing unit',
      usageCount: 210
    },
  },
};

export const BorderRadiusToken: Story = {
  args: {
    token: {
      name: 'border-radius-md',
      value: '0.5rem',
      type: 'border',
      category: 'radius',
      description: 'Medium border radius',
      usageCount: 78
    },
  },
};

export const ShadowToken: Story = {
  args: {
    token: {
      name: 'shadow-md',
      value: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      type: 'border',
      category: 'shadow',
      description: 'Medium shadow',
      usageCount: 36
    },
  },
};
