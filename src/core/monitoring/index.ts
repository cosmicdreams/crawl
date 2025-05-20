// src/core/monitoring/index.ts
import { EventEmitter } from 'events';

export interface PipelineEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  stage: string;
  timestamp: number;
  data?: any;
}

export interface StageProgress {
  stage: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number; // 0-100
  startTime?: number;
  endTime?: number;
  error?: string;
  details?: any;
}

export interface PipelineStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  stages: Record<string, StageProgress>;
  startTime?: number;
  endTime?: number;
  currentStage?: string;
  error?: string;
}

class PipelineMonitor extends EventEmitter {
  private static instance: PipelineMonitor;
  private pipelineStatuses: Record<string, PipelineStatus> = {};

  private constructor() {
    super();
  }

  public static getInstance(): PipelineMonitor {
    if (!PipelineMonitor.instance) {
      PipelineMonitor.instance = new PipelineMonitor();
    }
    return PipelineMonitor.instance;
  }

  // Start monitoring a pipeline
  public startPipeline(pipelineId: string, stages: string[]): void {
    const status: PipelineStatus = {
      id: pipelineId,
      status: 'pending',
      stages: {},
      startTime: Date.now()
    };

    // Initialize all stages as pending
    for (const stage of stages) {
      status.stages[stage] = {
        stage,
        status: 'pending',
        progress: 0
      };
    }

    this.pipelineStatuses[pipelineId] = status;

    this.emit('pipeline:start', { pipelineId, status });
    this.emit('pipelineUpdated', pipelineId, status);
  }

  // Update the status of a stage
  public updateStage(pipelineId: string, stage: string, update: Partial<StageProgress>): void {
    const status = this.pipelineStatuses[pipelineId];

    if (!status) {
      console.warn(`Pipeline ${pipelineId} not found`);
      return;
    }

    if (!status.stages[stage]) {
      console.warn(`Stage ${stage} not found in pipeline ${pipelineId}`);
      return;
    }

    // Update the stage
    status.stages[stage] = {
      ...status.stages[stage],
      ...update
    };

    // If the stage is now running, update the current stage
    if (update.status === 'running') {
      status.currentStage = stage;
      status.status = 'running';
      status.stages[stage].startTime = Date.now();

      this.emit('stageUpdated', pipelineId, stage, status.stages[stage]);
    }

    // If the stage is now completed, check if all stages are completed
    if (update.status === 'completed') {
      status.stages[stage].endTime = Date.now();

      const allCompleted = Object.values(status.stages).every(s => s.status === 'completed');

      if (allCompleted) {
        status.status = 'completed';
        status.endTime = Date.now();
        this.emit('pipeline:complete', { pipelineId, status });
        this.emit('pipelineCompleted', pipelineId, status);
      }
    }

    // If the stage has an error, mark the pipeline as having an error
    if (update.status === 'error') {
      status.status = 'error';
      status.error = update.error;
      status.stages[stage].endTime = Date.now();
      this.emit('pipeline:error', { pipelineId, stage, error: update.error });
      this.emit('pipelineError', pipelineId, update.error);
    }

    this.emit('pipeline:update', { pipelineId, stage, status });
    this.emit('pipelineUpdated', pipelineId, status);
  }

  // Get the status of a pipeline
  public getPipelineStatus(pipelineId: string): PipelineStatus | undefined {
    return this.pipelineStatuses[pipelineId];
  }

  // Get all pipeline statuses
  public getAllPipelineStatuses(): Record<string, PipelineStatus> {
    return { ...this.pipelineStatuses };
  }

  // Get all active pipeline IDs
  public getActivePipelines(): string[] {
    return Object.keys(this.pipelineStatuses).filter(id => {
      const status = this.pipelineStatuses[id];
      return status.status === 'running' || status.status === 'pending';
    });
  }

  // Cancel a pipeline
  public cancelPipeline(pipelineId: string): boolean {
    const status = this.pipelineStatuses[pipelineId];
    if (!status) {
      return false;
    }

    // Only running or pending pipelines can be cancelled
    if (status.status !== 'running' && status.status !== 'pending') {
      return false;
    }

    // Update the status
    status.status = 'error';
    status.error = 'Pipeline cancelled by user';
    status.endTime = Date.now();

    // Emit events
    this.emit('pipeline:error', { pipelineId, error: 'Pipeline cancelled by user' });
    this.emit('pipelineError', pipelineId, 'Pipeline cancelled by user');
    this.emit('pipelineUpdated', pipelineId, status);

    return true;
  }

  // Clear a pipeline status
  public clearPipelineStatus(pipelineId: string): void {
    delete this.pipelineStatuses[pipelineId];
  }
}

export const pipelineMonitor = PipelineMonitor.getInstance();
