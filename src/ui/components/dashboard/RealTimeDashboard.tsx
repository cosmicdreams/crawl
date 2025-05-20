// src/ui/components/dashboard/RealTimeDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { logger } from '../../../utils/logger.js';
import websocketService, { WebSocketMessage } from '../../services/websocket-service';
import { PipelineStatus } from '../../../core/monitoring/index.js';

interface RealTimeDashboardProps {
  refreshInterval?: number;
}

interface ActivePipeline {
  id: string;
  status: PipelineStatus;
  lastUpdated: number;
}

const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({ refreshInterval = 5000 }) => {
  const [activePipelines, setActivePipelines] = useState<ActivePipeline[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [useWebSocket, setUseWebSocket] = useState<boolean>(false);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Fetch active pipelines from the API
  const fetchActivePipelines = useCallback(async () => {
    try {
      const response = await apiClient.getActivePipelines();
      if (response.data) {
        setActivePipelines(response.data.pipelines.map(p => ({
          id: p.id,
          status: p.status,
          lastUpdated: Date.now()
        })));
        setLastRefresh(Date.now());
      } else if (response.error) {
        setError(`Failed to fetch active pipelines: ${response.error}`);
      }
    } catch (err) {
      setError('Failed to fetch active pipelines');
      logger.error('Error fetching active pipelines', { error: err });
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'pipeline:updated') {
      const { pipelineId, status } = message.payload;
      
      setActivePipelines(prev => {
        const existingPipelines = prev || [];
        // Check if this pipeline is already in our list
        const existingIndex = existingPipelines.findIndex(p => p.id === pipelineId);
        
        if (existingIndex >= 0) {
          // Update existing pipeline
          const updated = [...existingPipelines];
          updated[existingIndex] = {
            ...updated[existingIndex],
            status,
            lastUpdated: Date.now()
          };
          return updated;
        } else {
          // Add new pipeline
          return [...existingPipelines, {
            id: pipelineId,
            status,
            lastUpdated: Date.now()
          }];
        }
      });
    }
    
    if (message.type === 'pipeline:completed' || message.type === 'pipeline:error') {
      const { pipelineId, status } = message.payload;
      
      setActivePipelines(prev => {
        const existingPipelines = prev || [];
        // Update the pipeline status
        return existingPipelines.map(p => 
          p.id === pipelineId 
            ? { ...p, status, lastUpdated: Date.now() } 
            : p
        );
      });
    }
  }, []);

  // Set up WebSocket connection
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await websocketService.connect();
        setUseWebSocket(true);
        
        // Subscribe to all pipeline updates
        websocketService.send('subscribe', { topic: 'pipeline:*' });
        
        logger.info('WebSocket connected for real-time dashboard');
      } catch (error) {
        logger.error('Failed to connect to WebSocket for dashboard', { error });
        setUseWebSocket(false);
      }
    };
    
    connectWebSocket();
    
    // Set up message handlers
    const unsubscribePipelineUpdated = websocketService.subscribe('pipeline:updated', handleWebSocketMessage);
    const unsubscribePipelineCompleted = websocketService.subscribe('pipeline:completed', handleWebSocketMessage);
    const unsubscribePipelineError = websocketService.subscribe('pipeline:error', handleWebSocketMessage);
    
    return () => {
      // Unsubscribe from pipeline updates
      if (websocketService.isConnected()) {
        websocketService.send('unsubscribe', { topic: 'pipeline:*' });
      }
      
      // Remove message handlers
      unsubscribePipelineUpdated();
      unsubscribePipelineCompleted();
      unsubscribePipelineError();
    };
  }, [handleWebSocketMessage]);

  // Set up polling (fallback if WebSocket fails)
  useEffect(() => {
    // Initial fetch
    fetchActivePipelines();
    
    // Set up polling if not using WebSocket
    let interval: NodeJS.Timeout | null = null;
    
    if (!useWebSocket) {
      interval = setInterval(fetchActivePipelines, refreshInterval);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [fetchActivePipelines, refreshInterval, useWebSocket]);

  // Calculate time since last update
  const getTimeSinceUpdate = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) {
      return `${seconds} seconds ago`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} minutes ago`;
    } else {
      return `${Math.floor(seconds / 3600)} hours ago`;
    }
  };

  // Calculate overall progress
  const calculateProgress = (status: PipelineStatus): number => {
    const stages = Object.values(status?.stages || {});
    if (!stages?.length) return 0;
    
    const totalProgress = stages.reduce((sum, stage) => sum + (stage?.progress || 0), 0);
    return Math.round(totalProgress / stages.length);
  };

  // Render the dashboard
  return (
    <div className="real-time-dashboard">
      <div className="dashboard-header">
        <h2>Active Pipelines</h2>
        <div className="connection-status">
          <span className={`status-indicator ${useWebSocket ? 'connected' : 'disconnected'}`}></span>
          <span>{useWebSocket ? 'Real-time updates' : 'Polling updates'}</span>
        </div>
        <div className="refresh-info">
          Last refreshed: {getTimeSinceUpdate(lastRefresh)}
          <button 
            onClick={fetchActivePipelines}
            disabled={loading}
            className="refresh-button"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading && activePipelines.length === 0 ? (
        <div className="loading">Loading pipelines...</div>
      ) : activePipelines.length === 0 ? (
        <div className="no-pipelines">No active pipelines</div>
      ) : (
        <div className="pipelines-list">
          {activePipelines.map(pipeline => (
            <div key={pipeline.id} className={`pipeline-card status-${pipeline.status.status}`}>
              <div className="pipeline-header">
                <h3>Pipeline: {pipeline.id}</h3>
                <span className={`status-badge ${pipeline.status.status}`}>
                  {pipeline.status.status}
                </span>
              </div>
              
              <div className="pipeline-details">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${calculateProgress(pipeline.status)}%` }}
                  ></div>
                  <span className="progress-text">
                    {calculateProgress(pipeline.status)}%
                  </span>
                </div>
                
                <div className="pipeline-info">
                  <div>Current stage: {pipeline.status.currentStage || 'None'}</div>
                  <div>Started: {pipeline.status.startTime ? new Date(pipeline.status.startTime).toLocaleTimeString() : 'N/A'}</div>
                  <div>Updated: {getTimeSinceUpdate(pipeline.lastUpdated)}</div>
                </div>
              </div>
              
              {pipeline.status.error && (
                <div className="pipeline-error">
                  Error: {pipeline.status.error}
                </div>
              )}
              
              <div className="pipeline-actions">
                <button 
                  onClick={() => window.location.href = `/pipeline/${pipeline.id}`}
                  className="view-button"
                >
                  View Details
                </button>
                
                {pipeline.status.status === 'running' && (
                  <button 
                    onClick={async () => {
                      try {
                        await apiClient.cancelPipeline(pipeline.id);
                      } catch (err) {
                        setError(`Failed to cancel pipeline: ${err}`);
                      }
                    }}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>
        {`
        .real-time-dashboard {
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #dee2e6;
        }
        
        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .status-indicator {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        
        .connected {
          background-color: #28a745;
        }
        
        .disconnected {
          background-color: #dc3545;
        }
        
        .refresh-info {
          font-size: 0.9rem;
          color: #6c757d;
        }
        
        .refresh-button {
          margin-left: 10px;
          padding: 4px 8px;
          background-color: #f8f9fa;
          border: 1px solid #ced4da;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .error-message {
          padding: 10px;
          margin-bottom: 20px;
          background-color: #f8d7da;
          color: #721c24;
          border-radius: 4px;
        }
        
        .loading, .no-pipelines {
          padding: 20px;
          text-align: center;
          color: #6c757d;
        }
        
        .pipelines-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        
        .pipeline-card {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          padding: 15px;
          border-left: 4px solid #6c757d;
        }
        
        .status-running {
          border-left-color: #007bff;
        }
        
        .status-completed {
          border-left-color: #28a745;
        }
        
        .status-error {
          border-left-color: #dc3545;
        }
        
        .pipeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .running {
          background-color: #cce5ff;
          color: #004085;
        }
        
        .completed {
          background-color: #d4edda;
          color: #155724;
        }
        
        .error {
          background-color: #f8d7da;
          color: #721c24;
        }
        
        .progress-bar {
          height: 20px;
          background-color: #e9ecef;
          border-radius: 4px;
          margin-bottom: 10px;
          position: relative;
        }
        
        .progress-fill {
          height: 100%;
          background-color: #007bff;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        
        .progress-text {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #212529;
          font-weight: bold;
          font-size: 0.8rem;
        }
        
        .pipeline-info {
          margin-bottom: 10px;
          font-size: 0.9rem;
        }
        
        .pipeline-error {
          padding: 8px;
          margin-bottom: 10px;
          background-color: #f8d7da;
          color: #721c24;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        
        .pipeline-actions {
          display: flex;
          gap: 10px;
        }
        
        .view-button, .cancel-button {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 0.9rem;
          cursor: pointer;
          border: none;
        }
        
        .view-button {
          background-color: #007bff;
          color: white;
        }
        
        .cancel-button {
          background-color: #dc3545;
          color: white;
        }
        `}
      </style>
    </div>
  );
};

export default RealTimeDashboard;
