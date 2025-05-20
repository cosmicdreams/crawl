// src/ui/components/flow/PipelineFlow.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { act } from 'react-dom/test-utils';
import PipelineFlow from './PipelineFlow';
import { apiClient } from '../../api/client';

// Mock the API client
vi.mock('../../api/client', () => ({
  apiClient: {
    getConfig: vi.fn().mockResolvedValue({
      data: {
        baseUrl: 'https://example.com',
        maxPages: 100,
        extractors: {
          colors: true,
          typography: true
        },
        tokens: {
          outputFormats: ['json'],
          prefix: 'dt'
        }
      }
    }),
    getPipelineConfig: vi.fn().mockResolvedValue({
      data: {
        nodes: [],
        edges: []
      }
    }),
    savePipelineConfig: vi.fn().mockResolvedValue({
      data: { success: true }
    })
  }
}));

// Mock the node types
vi.mock('./nodeTypes', () => ({
  nodeTypes: {
    crawler: () => <div data-testid="crawler-node">Crawler Node</div>,
    extractor: () => <div data-testid="extractor-node">Extractor Node</div>,
    tokenGenerator: () => <div data-testid="token-generator-node">Token Generator Node</div>
  }
}));

// Mock the PipelineMonitor component
vi.mock('../PipelineMonitor', () => ({
  default: ({ pipelineId }: { pipelineId: string }) => (
    <div data-testid="pipeline-monitor" data-pipeline-id={pipelineId}>
      Pipeline Monitor
    </div>
  )
}));

describe('PipelineFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when wrapped in ReactFlowProvider', async () => {
    await act(async () => {
      render(
        <ReactFlowProvider>
          <PipelineFlow 
            profile="test-profile"
            onNodeSelect={() => {}}
          />
        </ReactFlowProvider>
      );
    });

    // Check that the component renders
    expect(screen.getByText('Pipeline Flow')).toBeInTheDocument();
  });

  it('loads pipeline configuration on mount', async () => {
    // Mock the API response
    vi.mocked(apiClient.getPipelineConfig).mockResolvedValueOnce({
      data: {
        nodes: [
          {
            id: 'crawler-1',
            type: 'crawler',
            position: { x: 100, y: 100 },
            data: { label: 'Crawler', baseUrl: 'https://example.com' }
          }
        ],
        edges: []
      }
    });

    await act(async () => {
      render(
        <ReactFlowProvider>
          <PipelineFlow 
            profile="test-profile"
            onNodeSelect={() => {}}
          />
        </ReactFlowProvider>
      );
    });

    // Check that the API was called
    expect(apiClient.getPipelineConfig).toHaveBeenCalledWith('test-profile');
  });

  it('displays a message when no pipeline is configured', async () => {
    // Mock an empty pipeline configuration
    vi.mocked(apiClient.getPipelineConfig).mockResolvedValueOnce({
      data: {
        nodes: [],
        edges: []
      }
    });

    await act(async () => {
      render(
        <ReactFlowProvider>
          <PipelineFlow 
            profile="test-profile"
            onNodeSelect={() => {}}
          />
        </ReactFlowProvider>
      );
    });

    // Check for the empty state message
    expect(screen.getByText('No pipeline configured')).toBeInTheDocument();
  });

  it('shows pipeline monitor when a pipeline is running', async () => {
    await act(async () => {
      render(
        <ReactFlowProvider>
          <PipelineFlow 
            profile="test-profile"
            onNodeSelect={() => {}}
            runningPipelineId="test-pipeline-123"
          />
        </ReactFlowProvider>
      );
    });

    // Check that the pipeline monitor is displayed
    expect(screen.getByTestId('pipeline-monitor')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-monitor')).toHaveAttribute('data-pipeline-id', 'test-pipeline-123');
  });
});
