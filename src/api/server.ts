// src/api/server.ts
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { ConfigManager } from '../utils/config-manager.js';
import { runCrawler } from './run-crawler.js';
import { templates, createProfileFromTemplate } from '../core/templates/index.js';
import { logger } from '../utils/logger.js';
import { websocketManager } from './websocket-server.js';

const app = express();
const PORT = process.env.PORT || 3002; // Changed default port from 3001 to 3002
const configManager = new ConfigManager();

// Create a simple mock pipeline monitor
const pipelineMonitor = {
  getAllPipelineStatuses: () => ({}),
  getPipelineStatus: (id: string) => null,
  emit: (event: string, ...args: any[]) => {}
};

// Create HTTP server
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'dist', 'api', 'public')));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  const start = Date.now();

  // Add response listener to log after completion
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`, {
      statusCode: res.statusCode,
      duration
    });
  });

  next();
});

// Serve API documentation
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'api', 'public', 'index.html'));
});

// Load configuration
const config = configManager.getConfig();

// API routes
app.get('/api/config', (req, res) => {
  res.json(config);
});

// Get available templates
app.get('/api/templates', (req, res) => {
  res.json({ templates });
});

// Get a specific template
app.get('/api/templates/:id', (req, res) => {
  const { id } = req.params;
  const template = templates.find(t => t.id === id);

  if (template) {
    res.json(template);
  } else {
    res.status(404).json({ error: 'Template not found' });
  }
});

// Get available profiles
app.get('/api/profiles', (req, res) => {
  const configDir = path.join(process.cwd(), 'config');
  try {
    const files = fs.readdirSync(configDir);
    const profiles = files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));

    res.json({ profiles });
  } catch (error) {
    logger.error('Failed to read profiles', { error });
    res.status(500).json({
      error: 'Failed to read profiles',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get tokens for a specific profile
app.get('/api/tokens/:profile', (req, res) => {
  const { profile } = req.params;
  const configPath = path.join(process.cwd(), 'config', `${profile}.json`);

  try {
    // Load the profile configuration
    const profileConfigManager = new ConfigManager(configPath);
    const profileConfig = profileConfigManager.getConfig();

    // Determine the output directory
    const outputDir = profileConfig.outputDir || './results';
    const tokensPath = path.join(process.cwd(), outputDir, 'tokens', 'tokens.json');

    if (fs.existsSync(tokensPath)) {
      const tokensData = fs.readFileSync(tokensPath, 'utf8');
      const tokens = JSON.parse(tokensData);
      res.json(tokens);
    } else {
      res.status(404).json({ error: 'Tokens not found for this profile' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read tokens' });
  }
});

// Get all extracted data for a profile
app.get('/api/data/:profile', (req, res) => {
  const { profile } = req.params;
  const configPath = path.join(process.cwd(), 'config', `${profile}.json`);

  try {
    // Load the profile configuration
    const profileConfigManager = new ConfigManager(configPath);
    const profileConfig = profileConfigManager.getConfig();

    // Determine the output directory
    const outputDir = profileConfig.outputDir || './results';
    const rawDir = path.join(process.cwd(), outputDir, 'raw');

    const data: Record<string, any> = {};

    // Read all JSON files in the raw directory
    if (fs.existsSync(rawDir)) {
      const files = fs.readdirSync(rawDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(rawDir, file);
          const fileData = fs.readFileSync(filePath, 'utf8');
          const key = file.replace('.json', '');
          data[key] = JSON.parse(fileData);
        }
      }
      res.json(data);
    } else {
      res.status(404).json({ error: 'No data found for this profile' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Run the crawler for a profile
app.post('/api/run/:profile', async (req, res) => {
  const { profile } = req.params;
  const { options } = req.body;

  try {
    // Start the crawler as a background process
    runCrawler(profile, options)
      .then(result => {
        console.log(`Crawler completed: ${result.message}`);
      })
      .catch(error => {
        console.error(`Crawler failed: ${error.message}`);
      });

    // Return immediately with a success response
    res.json({
      status: 'started',
      profile,
      options,
      message: 'Crawler started in the background'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: `Failed to start crawler: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// Create a new profile from a template
// @ts-ignore - TypeScript has issues with Express route handlers
app.post('/api/profiles/create', async function(req, res) {
  const { templateId, profileName, baseUrl } = req.body;

  if (!templateId || !profileName || !baseUrl) {
    return res.status(400).json({
      error: 'Missing required parameters: templateId, profileName, baseUrl'
    });
  }

  try {
    // Create a new config from the template
    const config = createProfileFromTemplate(templateId, profileName, baseUrl);

    // Save the config to a file
    const configPath = path.join(process.cwd(), 'config', `${profileName}.json`);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    res.json({
      status: 'success',
      message: `Profile ${profileName} created successfully`,
      config
    });
  } catch (error) {
    logger.error('Failed to create profile', { error, templateId, profileName });
    res.status(500).json({
      status: 'error',
      message: `Failed to create profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// 404 handler for undefined routes
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.url}`
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error in request', {
    error: err,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// Initialize WebSocket server
websocketManager.initialize(server);

// Get all active pipelines
app.get('/api/pipelines/active', (req, res) => {
  // Mock response for now
  res.json({
    pipelines: []
  });
});

// Cancel a pipeline
app.post('/api/pipeline/:id/cancel', (req, res) => {
  const pipelineId = req.params.id;

  try {
    // Mock response for now
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to cancel pipeline', { pipelineId, error });
    res.status(500).json({ error: 'Failed to cancel pipeline' });
  }
});

// WebSocket API endpoints
app.get('/api/ws-status', (req, res) => {
  res.json({
    status: 'ok',
    websocketEnabled: true,
    url: `ws://${req.headers.host?.split(':')[0] || 'localhost'}:${PORT}/ws`
  });
});

// Start the server
server.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`);
  logger.info(`WebSocket server running on ws://localhost:${PORT}/ws`);
});

// Handle server shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  websocketManager.cleanup();
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

export default app;
