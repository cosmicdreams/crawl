// src/ui/components/flow/PipelineFlow.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ReactFlowProvider } from 'reactflow';
import PipelineFlow from './PipelineFlow';

const meta = {
  title: 'Flow/PipelineFlow',
  component: PipelineFlow,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '600px' }}>
        <ReactFlowProvider>
          <Story />
        </ReactFlowProvider>
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof PipelineFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    profile: 'example',
  },
};

export const WithNodeSelection: Story = {
  args: {
    profile: 'example',
    onNodeSelect: (nodeId, data) => {
      console.log('Node selected:', nodeId, data);
    },
  },
};
