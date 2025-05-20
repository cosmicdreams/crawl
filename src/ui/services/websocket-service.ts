// src/ui/services/websocket-service.ts
import { logger } from '../../utils/logger.js';
import { apiClient } from '../api/client';

export interface WebSocketMessage {
  type: string;
  payload: any;
}

export type MessageHandler = (message: WebSocketMessage) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private connectionHandlers: Set<() => void> = new Set();
  private disconnectionHandlers: Set<() => void> = new Set();
  private url: string | null = null;

  constructor() {}

  /**
   * Get the WebSocket URL from the API
   */
  private async getWebSocketUrl(): Promise<string> {
    if (this.url) {
      return this.url;
    }

    try {
      const response = await apiClient.getWebSocketStatus();
      if (response.data && response.data.websocketEnabled) {
        this.url = response.data.url;
        return this.url;
      }
      throw new Error('WebSocket not enabled');
    } catch (error) {
      logger.error('Failed to get WebSocket URL', { error });
      // Fallback to default URL
      this.url = 'ws://localhost:3001/ws';
      return this.url;
    }
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        logger.info('WebSocket already connected');
        resolve();
        return;
      }

      try {
        const url = await this.getWebSocketUrl();
        this.socket = new WebSocket(url);
        logger.info(`Connecting to WebSocket at ${url}`);
      } catch (error) {
        reject(error);
        return;
      }

      this.socket.onopen = () => {
        logger.info('WebSocket connected');
        this.reconnectAttempts = 0;
        this.notifyConnectionHandlers();
        resolve();
      };

      this.socket.onclose = (event) => {
        logger.warn('WebSocket disconnected', { code: event.code, reason: event.reason });
        this.notifyDisconnectionHandlers();
        this.attemptReconnect();
      };

      this.socket.onerror = (error) => {
        logger.error('WebSocket error', { error });
        reject(error);
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          this.handleMessage(message);
        } catch (error) {
          logger.error('Error parsing WebSocket message', { error, data: event.data });
        }
      };
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      logger.info('WebSocket disconnected');
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Send a message to the WebSocket server
   */
  send(type: string, payload: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send message, WebSocket not connected');
      return;
    }

    const message: WebSocketMessage = { type, payload };
    this.socket.send(JSON.stringify(message));
    logger.debug('Sent WebSocket message', { type, payload });
  }

  /**
   * Subscribe to a specific message type
   */
  subscribe(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type)!.add(handler);
    logger.debug(`Subscribed to message type: ${type}`);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(type, handler);
    };
  }

  /**
   * Unsubscribe from a specific message type
   */
  unsubscribe(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      return;
    }

    this.messageHandlers.get(type)!.delete(handler);
    logger.debug(`Unsubscribed from message type: ${type}`);
  }

  /**
   * Subscribe to connection events
   */
  onConnect(handler: () => void): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  /**
   * Subscribe to disconnection events
   */
  onDisconnect(handler: () => void): () => void {
    this.disconnectionHandlers.add(handler);
    return () => this.disconnectionHandlers.delete(handler);
  }

  /**
   * Check if the WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Handle an incoming message
   */
  private handleMessage(message: WebSocketMessage): void {
    logger.debug('Received WebSocket message', { type: message.type });

    // Handle global messages (subscribed to all messages)
    if (this.messageHandlers.has('*')) {
      this.messageHandlers.get('*')!.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          logger.error('Error in global message handler', { error, message });
        }
      });
    }

    // Handle type-specific messages
    if (this.messageHandlers.has(message.type)) {
      this.messageHandlers.get(message.type)!.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          logger.error(`Error in message handler for type ${message.type}`, { error, message });
        }
      });
    }
  }

  /**
   * Attempt to reconnect to the WebSocket server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn('Maximum reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(error => {
        logger.error('Reconnect attempt failed', { error });
      });
    }, delay);
  }

  /**
   * Notify all connection handlers
   */
  private notifyConnectionHandlers(): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        logger.error('Error in connection handler', { error });
      }
    });
  }

  /**
   * Notify all disconnection handlers
   */
  private notifyDisconnectionHandlers(): void {
    this.disconnectionHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        logger.error('Error in disconnection handler', { error });
      }
    });
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService();

export default websocketService;
