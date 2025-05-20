// src/ui/api/client.ts
import { DesignToken, CrawlConfig } from '../../core/types.js';
import { PipelineTemplate } from '../../core/templates/index.js';
import { PipelineStatus } from '../../core/monitoring/index.js';
import { logger } from '../../utils/logger.js';

// In browser environments, process.env is not available, so we use a default API URL
const API_BASE_URL = (typeof process !== 'undefined' && process.env && process.env.API_URL) 
  ? process.env.API_URL 
  : 'http://localhost:3002/api';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface WebSocketStatus {
  status: string;
  websocketEnabled: boolean;
  url: string;
}

export interface ActivePipelinesResponse {
  pipelines: {
    id: string;
    status: PipelineStatus;
  }[];
}

export interface ProfileData {
  profiles: string[];
}

export interface TemplatesData {
  templates: PipelineTemplate[];
}

export interface RunOptions {
  url?: string;
  maxPages?: number;
  extractors?: string[];
  generateTokens?: boolean;
  skipCache?: boolean;
  debug?: boolean;
}

export interface CreateProfileOptions {
  templateId: string;
  profileName: string;
  baseUrl: string;
}

export interface RunResponse {
  status: string;
  profile: string;
  options?: RunOptions;
  message: string;
  pipelineId?: string;
}

export interface ExtractedData {
  'crawl-results'?: any;
  'color-analysis'?: DesignToken[];
  'typography-analysis'?: DesignToken[];
  'spacing-analysis'?: DesignToken[];
  'border-analysis'?: DesignToken[];
  [key: string]: any;
}

class ApiClient {
  /**
   * Get the available configuration profiles
   */
  async getProfiles(): Promise<ApiResponse<ProfileData>> {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get the configuration for a specific profile
   */
  async getConfig(profile: string): Promise<ApiResponse<CrawlConfig>> {
    try {
      const response = await fetch(`${API_BASE_URL}/config/${profile}`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get the tokens for a specific profile
   */
  async getTokens(profile: string): Promise<ApiResponse<DesignToken[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/tokens/${profile}`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get all extracted data for a profile
   */
  async getData(profile: string): Promise<ApiResponse<ExtractedData>> {
    try {
      const response = await fetch(`${API_BASE_URL}/data/${profile}`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Run the crawler for a profile
   */
  async runCrawler(profile: string, options?: RunOptions): Promise<ApiResponse<RunResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/run/${profile}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ options }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get all available templates
   */
  async getTemplates(): Promise<ApiResponse<TemplatesData>> {
    try {
      const response = await fetch(`${API_BASE_URL}/templates`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(id: string): Promise<ApiResponse<PipelineTemplate>> {
    try {
      const response = await fetch(`${API_BASE_URL}/templates/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Create a new profile from a template
   */
  async createProfile(options: CreateProfileOptions): Promise<ApiResponse<{ config: CrawlConfig }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get the status of a pipeline
   */
  async getPipelineStatus(pipelineId: string): Promise<ApiResponse<PipelineStatus>> {
    try {
      const response = await fetch(`${API_BASE_URL}/pipeline/${pipelineId}/status`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      logger.error('Failed to get pipeline status', { pipelineId, error });
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Cancel a running pipeline
   */
  async cancelPipeline(pipelineId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/pipeline/${pipelineId}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      logger.info('Pipeline cancelled', { pipelineId });
      return { data };
    } catch (error) {
      logger.error('Failed to cancel pipeline', { pipelineId, error });
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get the results of a pipeline
   */
  async getPipelineResults(pipelineId: string): Promise<ApiResponse<ExtractedData>> {
    try {
      const response = await fetch(`${API_BASE_URL}/pipeline/${pipelineId}/results`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      logger.error('Failed to get pipeline results', { pipelineId, error });
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Check if WebSocket is available and get the WebSocket URL
   */
  async getWebSocketStatus(): Promise<ApiResponse<WebSocketStatus>> {
    try {
      const response = await fetch(`${API_BASE_URL}/ws-status`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      logger.error('Failed to get WebSocket status', { error });
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get all active pipelines
   */
  async getActivePipelines(): Promise<ApiResponse<ActivePipelinesResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/pipelines/active`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      logger.error('Failed to get active pipelines', { error });
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const apiClient = new ApiClient();
