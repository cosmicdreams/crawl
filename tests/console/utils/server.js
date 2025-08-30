import http from 'http';
import fs from 'fs';
import path from 'path';

/**
 * Start a mock HTTP server serving static files from rootDir.
 * @param {string} rootDir - Directory containing static files.
 * @param {number} [port=0] - Port to listen on (0 for random).
 * @returns {Promise<import('http').Server>} Resolves with the HTTP server.
 */
export function startMockServer(rootDir, port = 0) {
  const server = http.createServer((req, res) => {
    const urlPath = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(rootDir, urlPath);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        return res.end('Not Found');
      }
      res.end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.listen(port, () => resolve(server));
    server.on('error', reject);
  });
}