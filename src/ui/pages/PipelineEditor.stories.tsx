// src/ui/pages/PipelineEditor.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import PipelineEditor from './PipelineEditor';

const meta = {
  title: 'Pages/PipelineEditor',
  component: PipelineEditor,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PipelineEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialProfile: 'example',
  },
};
