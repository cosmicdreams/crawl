// src/ui/nodes/ExtractorNode.stories.tsx
// Using ESM syntax
import React from 'react';
import { Story, Meta } from '@storybook/react';
import ExtractorNode, { ExtractorNodeProps } from './ExtractorNode';

export default {
    title: 'Pipeline/ExtractorNode',
    component: ExtractorNode,
    argTypes: {
        data: {
            type: {
                control: {
                    type: 'select',
                    options: ['typography', 'colors', 'spacing', 'borders', 'animations']
                }
            },
            status: {
                control: {
                    type: 'select',
                    options: ['idle', 'running', 'completed', 'error']
                }
            }
        }
    }
} as Meta;

const Template: Story<ExtractorNodeProps> = (args) => <ExtractorNode {...args} />;

export const Default = Template.bind({});
Default.args = {
    id: 'extractor-1',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
        label: 'Typography Extractor',
        type: 'typography',
        status: 'idle'
    }
};

export const Running = Template.bind({});
Running.args = {
    ...Default.args,
    data: {
        ...Default.args.data,
        status: 'running',
        progress: 45
    }
};

export const Completed = Template.bind({});
Completed.args = {
    ...Default.args,
    data: {
        ...Default.args.data,
        status: 'completed',
        stats: {
            duration: '3.2s',
            elementsProcessed: 1245,
            tokensGenerated: 87
        }
    }
};

export const Error = Template.bind({});
Error.args = {
    ...Default.args,
    data: {
        ...Default.args.data,
        status: 'error',
        error: 'Failed to read input file'
    }
};