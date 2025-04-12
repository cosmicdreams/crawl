/**
 * Mock server for end-to-end tests
 *
 * This server provides a simple website with predictable design elements
 * that can be crawled and analyzed by the Design Token Crawler.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Serve static HTML files
app.use(express.static(path.join(__dirname, 'mock-site')));

// Define routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'mock-site', 'index.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'mock-site', 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'mock-site', 'contact.html'));
});

// Start the server
let server;
function startServer() {
  return new Promise((resolve) => {
    server = app.listen(port, () => {
      console.log(`Mock server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('Mock server stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export {
  startServer,
  stopServer,
  port
};

// If this file is run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
