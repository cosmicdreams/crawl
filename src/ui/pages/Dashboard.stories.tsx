// src/ui/pages/Dashboard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import Dashboard from './Dashboard';

const meta = {
  title: 'Pages/Dashboard',
  component: Dashboard,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Dashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    outputDir: './results'
  },
};
