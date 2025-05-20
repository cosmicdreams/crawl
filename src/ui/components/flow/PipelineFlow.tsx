// src/ui/components/flow/PipelineFlow.tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionLineType,
  Panel,
  useReactFlow,
  NodeChange,
  EdgeChange
} from 'reactflow';
import 'reactflow/dist/style.css';

import { nodeTypes } from './nodeTypes';
import { CrawlerNodeData } from './CrawlerNode';
import { ExtractorNodeData } from './ExtractorNode';
import { TokenGeneratorNodeData } from './TokenGeneratorNode';
import { apiClient } from '../../api/client';
import { logger } from '../../../utils/logger.js';
import PipelineMonitor from '../PipelineMonitor';

export type PipelineNodeData = CrawlerNodeData | ExtractorNodeData | TokenGeneratorNodeData;

interface PipelineFlowProps {
  profile: string;
  onNodeSelect?: (nodeId: string, data: PipelineNodeData) => void;
  onRunPipeline?: (profile: string) => Promise<{ pipelineId?: string }>;
  readOnly?: boolean;
}

const PipelineFlow: React.FC<PipelineFlowProps> = ({ profile, onNodeSelect, onRunPipeline, readOnly = false }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [showMonitor, setShowMonitor] = useState(false);

  // Get the ReactFlow instance
  const reactFlowInstance = useReactFlow();

  // Load pipeline configuration
  useEffect(() => {
    const loadPipeline = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get configuration for the profile
        const configResponse = await apiClient.getConfig(profile);
        if (!configResponse.data) {
          throw new Error(configResponse.error || 'Failed to load configuration');
        }

        // Get extracted data for the profile
        const dataResponse = await apiClient.getData(profile);

        // Create nodes based on configuration and data
        const newNodes: Node<PipelineNodeData>[] = [];
        const newEdges: Edge[] = [];

        // Add crawler node
        newNodes.push({
          id: 'crawler',
          type: 'crawler',
          position: { x: 250, y: 50 },
          data: {
            label: 'Crawler',
            status: 'completed',
            baseUrl: configResponse.data?.baseUrl,
            maxPages: configResponse.data?.maxPages,
            pagesDiscovered: dataResponse.data?.['crawl-results']?.length || 0,
            pagesCrawled: dataResponse.data?.['crawl-results']?.length || 0
          },
          draggable: !readOnly
        });

        // Add extractor nodes
        const extractors = ['color', 'typography', 'spacing', 'border'];
        let lastNodeId = 'crawler';

        extractors.forEach((extractor, index) => {
          const nodeId = `${extractor}-extractor`;
          const extractorType = extractor as 'color' | 'typography' | 'spacing' | 'border';

          // Check if this extractor is enabled in the config
          const isEnabled = configResponse.data?.extractors?.[`${extractor}s`] !== undefined;

          if (isEnabled) {
            // Add the node
            newNodes.push({
              id: nodeId,
              type: 'extractor',
              position: { x: 250, y: 150 + (index * 100) },
              data: {
                label: `${extractor.charAt(0).toUpperCase() + extractor.slice(1)} Extractor`,
                status: 'completed',
                extractorType,
                itemsExtracted: dataResponse.data?.[`${extractor}-analysis`]?.length || 0,
                options: configResponse.data?.extractors?.[`${extractor}s`] ?? null
              }
            });

            // Add edge from previous node
            newEdges.push({
              id: `${lastNodeId}-to-${nodeId}`,
              source: lastNodeId,
              target: nodeId,
              type: 'smoothstep'
            });

            lastNodeId = nodeId;
          }
        });

        // Add token generator node if enabled
        if (configResponse.data?.tokens) {
          const nodeId = 'token-generator';

          newNodes.push({
            id: nodeId,
            type: 'tokenGenerator',
            position: { x: 250, y: 150 + (extractors.length * 100) },
            data: {
              label: 'Token Generator',
              status: 'completed',
              outputFormats: configResponse.data?.tokens?.outputFormats,
              prefix: configResponse.data?.tokens?.prefix,
              tokensGenerated: dataResponse.data?.tokens?.length || 0
            }
          });

          // Add edge from last extractor
          newEdges.push({
            id: `${lastNodeId}-to-${nodeId}`,
            source: lastNodeId,
            target: nodeId,
            type: 'smoothstep'
          });
        }

        setNodes(newNodes);
        setEdges(newEdges);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadPipeline();
  }, [profile, setNodes, setEdges]);

  // Handle node selection
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (onNodeSelect) {
      onNodeSelect(node.id, node.data);
    }
  }, [onNodeSelect]);

  // Handle node position logging
  const handleNodePositionChange = useCallback(
    (changes: NodeChange[]) => {
      // Only apply changes if not in read-only mode
      if (!readOnly) {
        changes.forEach(change => {
          if (change.type === 'position' && change.position) {
            // Log node position changes
            logger.debug(`Node ${change.id} moved to position:`, change.position);
          }
        });
      }
    },
    [readOnly]
  );

  // Use effect to add position change handler
  useEffect(() => {
    // This is just for logging, the actual changes are handled by onNodesChange from useNodesState
    const handleChanges = (changes: NodeChange[]) => {
      handleNodePositionChange(changes);
    };

    // We could set up a subscription here if needed

    return () => {
      // Cleanup if needed
    };
  }, [handleNodePositionChange]);

  // Custom edge change handler
  const handleEdgeChanges = useCallback(
    (changes: EdgeChange[]) => {
      // Only apply changes if not in read-only mode
      if (!readOnly) {
        // Log edge changes if needed
        logger.debug('Edge changes:', changes);
      }
    },
    [readOnly]
  );

  // Handle edge connections
  const onConnect = useCallback(
    (params: Connection) => {
      // Only allow connections if not in read-only mode
      if (!readOnly) {
        setEdges((eds) => addEdge({ ...params, type: 'smoothstep' }, eds));
      }
    },
    [setEdges, readOnly]
  );

  // Run the pipeline
  const handleRunPipeline = useCallback(async () => {
    if (onRunPipeline && !running) {
      try {
        setRunning(true);
        const result = await onRunPipeline(profile);
        if (result.pipelineId) {
          setPipelineId(result.pipelineId);
          setShowMonitor(true);
        }
      } catch (error) {
        setError(`Failed to run pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setRunning(false);
      }
    }
  }, [onRunPipeline, profile, running]);

  // Handle pipeline completion
  const handlePipelineComplete = useCallback(() => {
    setShowMonitor(false);
    // Reload the pipeline data
    window.location.reload();
  }, []);

  if (loading) {
    return <div>Loading pipeline...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // Create a layout function to automatically arrange nodes
  const applyAutoLayout = useCallback(() => {
    setNodes((nds) => {
      return nds.map((node, index) => {
        // Position nodes in a vertical layout
        return {
          ...node,
          position: {
            x: 250,
            y: 50 + index * 150
          }
        };
      });
    });
  }, [setNodes]);

  // Create a function to fit the view
  const fitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  }, [reactFlowInstance]);

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      {showMonitor && pipelineId && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 10,
          padding: '20px',
          overflow: 'auto'
        }}>
          <h2>Pipeline Progress</h2>
          <PipelineMonitor pipelineId={pipelineId} onComplete={handlePipelineComplete} />
          <button
            onClick={() => setShowMonitor(false)}
            style={{
              marginTop: '20px',
              padding: '8px 16px',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Hide Monitor
          </button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background />

        <Panel position="top-right">
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={applyAutoLayout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              title="Auto-arrange nodes"
            >
              Auto Layout
            </button>

            <button
              onClick={fitView}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              title="Fit view to show all nodes"
            >
              Fit View
            </button>

            {onRunPipeline && (
              <button
                onClick={handleRunPipeline}
                disabled={running}
                style={{
                  padding: '8px 16px',
                  backgroundColor: running ? '#6c757d' : '#ffffff',
                  color: running ? '#ffffff' : '#0066cc',
                  border: '1px solid #0066cc',
                  borderRadius: '4px',
                  cursor: running ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {running ? 'Running...' : 'Run Pipeline'}
              </button>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default PipelineFlow;
