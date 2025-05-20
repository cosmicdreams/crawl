// src/api/websocket-server.js
import { WebSocketServer } from 'ws';
import { logger } from '../utils/logger.js';

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  initialize(server) {
    if (this.wss) {
      logger.warn('WebSocket server already initialized');
      return;
    }

    try {
      this.wss = new WebSocketServer({ server, path: '/ws' });

      this.wss.on('connection', (ws) => {
        logger.info('WebSocket client connected');
        this.clients.add(ws);

        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());
            logger.info('WebSocket message received', { type: data.type });
          } catch (error) {
            logger.error('Error parsing WebSocket message', { error });
          }
        });

        ws.on('close', () => {
          logger.info('WebSocket client disconnected');
          this.clients.delete(ws);
        });

        // Send a welcome message
        ws.send(JSON.stringify({
          type: 'connection',
          message: 'Connected to Design Token Crawler WebSocket server'
        }));
      });

      logger.info('WebSocket server initialized');
    } catch (error) {
      logger.error('Failed to initialize WebSocket server', { error });
    }
  }

  broadcast(message) {
    if (!this.wss) {
      logger.warn('WebSocket server not initialized');
      return;
    }

    const messageString = typeof message === 'string' ? message : JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.readyState === WebSocketServer.OPEN) {
        client.send(messageString);
      }
    });
  }

  cleanup() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      this.clients.clear();
      logger.info('WebSocket server closed');
    }
  }
}

export const websocketManager = new WebSocketManager();
