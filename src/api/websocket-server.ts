// src/api/websocket-server.ts
import { Server as HttpServer } from 'node:http';
import { logger } from '../utils/logger.js';

// Simple mock WebSocket manager
class WebSocketManager {
  initialize(server: HttpServer): void {
    logger.info('WebSocket server initialized (mock)');
  }

  broadcast(message: any): void {
    logger.info('Broadcasting message (mock)', { message });
  }

  cleanup(): void {
    logger.info('WebSocket server cleaned up (mock)');
  }
}

// Create a singleton instance
export const websocketManager = new WebSocketManager();

export default websocketManager;
