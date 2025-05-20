// src/ui/components/PipelineMonitor.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { PipelineStatus, StageProgress } from '../../core/monitoring/index.js';
import { apiClient } from '../api/client.js';
import { logger } from '../../utils/logger.js';
import websocketService, { WebSocketMessage } from '../services/websocket-service';

interface PipelineMonitorProps {
  pipelineId: string;
  onComplete?: () => void;
}

const PipelineMonitor: React.FC<PipelineMonitorProps> = ({ pipelineId, onComplete }) => {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [useWebSocket, setUseWebSocket] = useState<boolean>(false);

  // Fetch pipeline status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await apiClient.getPipelineStatus(pipelineId);
      if (response.data) {
        logger.info(`Pipeline status updated: ${response.data.status}`, {
          pipelineId,
          currentStage: response.data.currentStage,
          progress: calculateOverallProgress(response.data)
        });

        setStatus(response.data);

        // Set start time if not already set
        if (!startTime && response.data.startTime) {
          setStartTime(response.data.startTime);
        }

        // If the pipeline is completed or has an error, stop polling
        if (response.data.status === 'completed' || response.data.status === 'error') {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }

          if (response.data.status === 'completed' && onComplete) {
            logger.info(`Pipeline completed successfully`, { pipelineId });
            onComplete();
          } else if (response.data.status === 'error') {
            logger.error(`Pipeline failed with error`, {
              pipelineId,
              error: response.data.error
            });
          }
        }
      } else if (response.error) {
        logger.error(`Failed to fetch pipeline status`, { error: response.error });
        setError(`Failed to fetch pipeline status: ${response.error}`);
      }
    } catch (err) {
      logger.error(`Error fetching pipeline status`, { error: err });
      setError('Failed to fetch pipeline status');
    } finally {
      setLoading(false);
    }
  }, [pipelineId, pollingInterval, onComplete, startTime]);

  // Calculate overall progress
  const calculateOverallProgress = useCallback((pipelineStatus: PipelineStatus | null) => {
    if (!pipelineStatus) return 0;

    const stages = Object.values(pipelineStatus.stages);
    if (stages.length === 0) return 0;

    const totalProgress = stages.reduce((sum, stage) => sum + stage.progress, 0);
    return Math.round(totalProgress / stages.length);
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'pipeline:updated') {
      logger.info('Received pipeline update via WebSocket', { pipelineId });
      setStatus(message.payload.status);

      // Set start time if not already set
      if (!startTime && message.payload.status.startTime) {
        setStartTime(message.payload.status.startTime);
      }

      // Handle pipeline completion
      if (message.payload.status.status === 'completed') {
        logger.info('Pipeline completed (WebSocket notification)', { pipelineId });
        if (onComplete) {
          onComplete();
        }
      }

      // Handle pipeline error
      if (message.payload.status.status === 'error') {
        logger.error('Pipeline failed (WebSocket notification)', {
          pipelineId,
          error: message.payload.status.error
        });
        setError(message.payload.status.error || 'Pipeline failed');
      }
    }
  }, [pipelineId, onComplete, startTime]);

  // Set up WebSocket connection
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await websocketService.connect();
        setUseWebSocket(true);

        // Subscribe to pipeline updates
        const topic = `pipeline:${pipelineId}`;
        websocketService.send('subscribe', { topic });

        logger.info('WebSocket connected and subscribed to pipeline updates', { pipelineId });
      } catch (error) {
        logger.error('Failed to connect to WebSocket', { error });
        setUseWebSocket(false);
      }
    };

    connectWebSocket();

    // Set up message handler
    const unsubscribe = websocketService.subscribe('pipeline:updated', handleWebSocketMessage);

    return () => {
      // Unsubscribe from pipeline updates
      if (websocketService.isConnected()) {
        const topic = `pipeline:${pipelineId}`;
        websocketService.send('unsubscribe', { topic });
      }

      // Remove message handler
      unsubscribe();
    };
  }, [pipelineId, handleWebSocketMessage]);

  // Start polling for status updates (fallback if WebSocket fails)
  useEffect(() => {
    // If using WebSocket, don't use polling
    if (useWebSocket) {
      // Still fetch once to get initial state
      fetchStatus();
      return;
    }

    // Fetch status immediately
    fetchStatus();

    // Set up polling
    const interval = setInterval(fetchStatus, 1000);
    setPollingInterval(interval);

    // Clean up on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [fetchStatus, pollingInterval, useWebSocket]);

  // Update elapsed time
  useEffect(() => {
    if (!startTime) return;

    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  // Format elapsed time
  const formatElapsedTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  if (loading && !status) {
    return <div>Loading pipeline status...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!status) {
    return <div>No pipeline status found</div>;
  }

  const overallProgress = calculateOverallProgress(status);

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h2 style={{ marginTop: 0 }}>Pipeline Status</h2>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor:
              status.status === 'running' ? '#0066cc' :
              status.status === 'completed' ? '#28a745' :
              status.status === 'error' ? '#dc3545' : '#6c757d',
            marginRight: '10px'
          }} />
          <span style={{ fontWeight: 'bold' }}>
            {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
          </span>

          {status.status === 'running' && status.currentStage && (
            <span style={{ marginLeft: '10px', color: '#666' }}>
              Current stage: {status.currentStage}
            </span>
          )}
        </div>

        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          height: '20px',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor:
              status.status === 'completed' ? '#28a745' :
              status.status === 'error' ? '#dc3545' : '#0066cc',
            height: '100%',
            width: `${overallProgress}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '14px',
          color: '#666',
          marginTop: '5px'
        }}>
          <span>Overall Progress: {overallProgress}%</span>
          <span>
            {startTime ? (
              `Elapsed: ${formatElapsedTime(elapsedTime)}`
            ) : status.startTime ? (
              `Started: ${new Date(status.startTime).toLocaleTimeString()}`
            ) : ''}
          </span>
        </div>
      </div>

      <h3>Stages</h3>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {Object.entries(status.stages).map(([stageName, stageStatus]) => (
          <StageProgressBar key={stageName} name={stageName} status={stageStatus} />
        ))}
      </div>

      {status.error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '10px',
          borderRadius: '4px',
          marginTop: '20px'
        }}>
          <strong>Error:</strong> {status.error}
        </div>
      )}
    </div>
  );
};

interface StageProgressBarProps {
  name: string;
  status: StageProgress;
}

const StageProgressBar: React.FC<StageProgressBarProps> = ({ name, status }) => {
  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      padding: '10px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '5px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor:
              status.status === 'running' ? '#0066cc' :
              status.status === 'completed' ? '#28a745' :
              status.status === 'error' ? '#dc3545' : '#6c757d',
            marginRight: '8px'
          }} />
          <span style={{ fontWeight: 'bold' }}>{name}</span>
        </div>

        <span style={{
          fontSize: '14px',
          color: '#666'
        }}>
          {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
        </span>
      </div>

      <div style={{
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        height: '10px',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor:
            status.status === 'completed' ? '#28a745' :
            status.status === 'error' ? '#dc3545' : '#0066cc',
          height: '100%',
          width: `${status.progress}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {status.startTime && status.endTime && (
        <div style={{
          fontSize: '12px',
          color: '#666',
          marginTop: '5px',
          textAlign: 'right'
        }}>
          Duration: {((status.endTime - status.startTime) / 1000).toFixed(2)}s
        </div>
      )}

      {status.error && (
        <div style={{
          color: '#dc3545',
          fontSize: '12px',
          marginTop: '5px'
        }}>
          {status.error}
        </div>
      )}
    </div>
  );
};

export default PipelineMonitor;
