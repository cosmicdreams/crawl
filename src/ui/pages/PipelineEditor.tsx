// src/ui/pages/PipelineEditor.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ReactFlowProvider, Node, Edge, NodeTypes } from 'reactflow';
import PipelineFlow, { PipelineNodeData } from '../components/flow/PipelineFlow';
import { apiClient, CreateProfileOptions, RunOptions } from '../api/client';
import TemplateSelector from '../components/TemplateSelector';
import PipelineMonitor from '../components/PipelineMonitor';
import { PipelineTemplate } from '../../core/templates/index.js';
import { logger } from '../../utils/logger.js';
import CrawlerNode from '../components/flow/CrawlerNode';
import ExtractorNode from '../components/flow/ExtractorNode';
import TokenGeneratorNode from '../components/flow/TokenGeneratorNode';
import ReportNode from '../components/flow/ReportNode';

interface PipelineEditorProps {
  initialProfile?: string;
}

const PipelineEditor: React.FC<PipelineEditorProps> = ({ initialProfile = 'default' }) => {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>(initialProfile);
  const [selectedNode, setSelectedNode] = useState<{ id: string; data: PipelineNodeData } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [showMonitor, setShowMonitor] = useState(false);
  const [runOptions, setRunOptions] = useState<RunOptions>({
    maxPages: 10,
    extractors: ['colors', 'typography', 'spacing', 'borders'],
    generateTokens: true
  });
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<{ status: string; currentStage?: string; stages?: Record<string, any> }>({ status: 'idle' });

  // Define node types
  const nodeTypes: NodeTypes = {
    crawler: CrawlerNode,
    extractor: ExtractorNode,
    tokenGenerator: TokenGeneratorNode,
    report: ReportNode
  };

  // Define initial nodes and edges for the pipeline
  const initialNodes: Node[] = [
    {
      id: 'crawler-1',
      type: 'crawler',
      position: { x: 250, y: 100 },
      data: {
        label: 'Site Crawler',
        config: {
          baseUrl: 'https://example.com',
          maxPages: 10
        }
      }
    },
    {
      id: 'extractor-1',
      type: 'extractor',
      position: { x: 250, y: 250 },
      data: {
        label: 'Color Extractor',
        type: 'colors'
      }
    },
    {
      id: 'token-generator-1',
      type: 'tokenGenerator',
      position: { x: 250, y: 400 },
      data: {
        label: 'Token Generator',
        formats: ['css', 'json', 'figma']
      }
    }
  ];

  const initialEdges: Edge[] = [
    { id: 'e1-2', source: 'crawler-1', target: 'extractor-1' },
    { id: 'e2-3', source: 'extractor-1', target: 'token-generator-1' }
  ];

  // Load available profiles
  useEffect(() => {
    const loadProfiles = async () => {
      const response = await apiClient.getProfiles();
      if (response.data) {
        setProfiles(response.data.profiles);
      } else if (response.error) {
        setError(`Failed to load profiles: ${response.error}`);
      }
    };

    loadProfiles();
  }, []);

  // Handle node selection
  const handleNodeSelect = (nodeId: string, data: PipelineNodeData) => {
    setSelectedNode({ id: nodeId, data });
    logger.info(`Selected node: ${nodeId}`, { nodeType: data.type, nodeData: data });
  };

  // Handle running the pipeline
  const handleRunPipeline = async () => {
    setLoading(true);

    try {
      const response = await apiClient.runCrawler(activeProfile, runOptions);

      if (response.data) {
        logger.info('Pipeline started:', { pipelineId: response.data.pipelineId, profile: activeProfile });
        setSuccessMessage(`Pipeline started for profile: ${activeProfile}`);
        setTimeout(() => setSuccessMessage(null), 5000); // Clear after 5 seconds

        // Set the active pipeline ID and show the monitor
        if (response.data.pipelineId) {
          setActivePipelineId(response.data.pipelineId);
          setShowMonitor(true);
        }
      } else if (response.error) {
        setError(`Failed to run pipeline: ${response.error}`);
      }
    } catch (err) {
      logger.error('Failed to run pipeline', { error: err });
      setError('Failed to run pipeline');
    } finally {
      setLoading(false);
    }
  };

  // Handle running the pipeline from the flow component
  const handleRunPipelineFromFlow = async (profile: string) => {
    try {
      logger.info(`Running pipeline for profile: ${profile}`, { options: runOptions });
      const response = await apiClient.runCrawler(profile, runOptions);

      if (response.data) {
        setSuccessMessage(`Pipeline started for profile: ${profile}`);
        setTimeout(() => setSuccessMessage(null), 5000); // Clear after 5 seconds
        return { pipelineId: response.data.pipelineId };
      } else {
        throw new Error(response.error || 'Failed to run pipeline');
      }
    } catch (error) {
      logger.error('Error running pipeline:', { error, profile });
      setError(`Failed to run pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  // Handle pipeline completion
  const handlePipelineComplete = () => {
    setSuccessMessage(`Pipeline completed successfully!`);
    setTimeout(() => setSuccessMessage(null), 5000); // Clear after 5 seconds
    setShowMonitor(false);
    // Refresh the pipeline flow to show updated data
    window.location.reload();
  };

  // Handle template selection
  const handleSelectTemplate = (template: PipelineTemplate) => {
    console.log('Selected template:', template);
    // This is just for demonstration, we'll use the createProfile function instead
  };

  // Handle creating a new profile from template
  const handleCreateProfile = async (options: CreateProfileOptions) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.createProfile(options);
      if (response.data) {
        // Refresh profiles list
        const profilesResponse = await apiClient.getProfiles();
        if (profilesResponse.data) {
          setProfiles(profilesResponse.data.profiles);
          // Set the newly created profile as active
          setActiveProfile(options.profileName);
          setSuccessMessage(`Profile "${options.profileName}" created successfully!`);
          setTimeout(() => setSuccessMessage(null), 5000); // Clear after 5 seconds
        }
        // Hide template selector
        setShowTemplateSelector(false);
      } else if (response.error) {
        setError(`Failed to create profile: ${response.error}`);
      }
    } catch (err) {
      setError('Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  // Execute pipeline with real-time updates
  const executePipeline = async () => {
    setPipelineStatus({
      status: 'running',
      currentStage: 'crawler-1'
    });

    // Simulate pipeline execution
    setTimeout(() => {
      setPipelineStatus({
        status: 'completed',
        stages: {
          'crawler-1': { status: 'completed', duration: '2.3s' },
          'extractor-1': { status: 'completed', duration: '1.5s' },
          'token-generator-1': { status: 'completed', duration: '0.8s' }
        }
      });
    }, 3000);
  };

  // Save pipeline configuration
  const savePipelineConfiguration = () => {
    console.log('Saving pipeline configuration:', nodes, edges);
  };

  // Load pipeline configuration
  const loadPipelineConfiguration = () => {
    console.log('Loading pipeline configuration');
    setNodes(initialNodes);
    setEdges(initialEdges);
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{
        backgroundColor: '#0066cc',
        color: 'white',
        padding: '16px 20px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0 }}>Pipeline Editor</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            value={activeProfile}
            onChange={(e) => setActiveProfile(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #fff',
              backgroundColor: 'transparent',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {profiles.map(profile => (
              <option key={profile} value={profile}>{profile}</option>
            ))}
          </select>

          <button
            onClick={() => setShowTemplateSelector(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid white',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            New Pipeline
          </button>

          <button
            onClick={handleRunPipeline}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#fff',
              color: '#0066cc',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Running...' : 'Run Pipeline'}
          </button>
        </div>
      </header>

      {showTemplateSelector ? (
        <div style={{ padding: '20px' }}>
          <TemplateSelector
            onSelectTemplate={handleSelectTemplate}
            onCreateProfile={handleCreateProfile}
          />
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={() => setShowTemplateSelector(false)}
              style={{
                backgroundColor: 'transparent',
                color: '#0066cc',
                border: 'none',
                padding: '10px 20px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : showMonitor && activePipelineId ? (
        <div style={{ padding: '20px' }}>
          <PipelineMonitor
            pipelineId={activePipelineId}
            onComplete={handlePipelineComplete}
          />
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={() => setShowMonitor(false)}
              style={{
                backgroundColor: 'transparent',
                color: '#0066cc',
                border: 'none',
                padding: '10px 20px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Back to Pipeline Editor
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
          <div style={{ flex: 1, padding: '20px' }}>
            <ReactFlowProvider>
              <PipelineFlow
                profile={activeProfile}
                onNodeSelect={handleNodeSelect}
                onRunPipeline={handleRunPipelineFromFlow}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
              />
              <div className="controls" style={{ marginTop: '20px' }}>
                <button onClick={executePipeline} style={{
                  padding: '8px 16px',
                  backgroundColor: '#0066cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  marginRight: '10px'
                }}>
                  Execute Pipeline
                </button>
                <button onClick={savePipelineConfiguration} style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  marginRight: '10px'
                }}>
                  Save Layout
                </button>
                <button onClick={loadPipelineConfiguration} style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffc107',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}>
                  Load Layout
                </button>
              </div>
            </ReactFlowProvider>
          </div>

          {selectedNode && (
            <div style={{
              width: '300px',
              borderLeft: '1px solid #ddd',
              padding: '20px',
              backgroundColor: '#f8f9fa'
            }}>
              <h2 style={{ marginTop: 0 }}>{selectedNode.data.label}</h2>

              <div style={{
                padding: '10px',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px solid #ddd',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor:
                      selectedNode.data.status === 'running' ? '#0066cc' :
                      selectedNode.data.status === 'completed' ? '#28a745' :
                      selectedNode.data.status === 'error' ? '#dc3545' : '#6c757d',
                    marginRight: '8px'
                  }} />
                  <span>{selectedNode.data.status || 'idle'}</span>
                </div>

                <pre style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontSize: '14px'
                }}>
                  {selectedNode.data.details}
                </pre>
              </div>

              <h3>Configuration</h3>
              <pre style={{
                backgroundColor: 'white',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px',
                overflow: 'auto'
              }}>
                {JSON.stringify(selectedNode.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#dc3545',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              marginLeft: '10px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#28a745',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}>
          {successMessage}
          <button
            onClick={() => setSuccessMessage(null)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              marginLeft: '10px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default PipelineEditor;