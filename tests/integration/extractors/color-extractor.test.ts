// tests/integration/extractors/color-extractor.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColorExtractorStage } from '../../../src/core/stages/color-extractor-stage.js';
import { CrawlResult } from '../../../src/core/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, Browser } from 'playwright';
import http from 'node:http';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to the test HTML file
const TEST_HTML_PATH = path.resolve(__dirname, '../../fixtures/html/test-page.html');

describe('ColorExtractorStage Integration Test', () => {
  let server: http.Server;
  let serverUrl: string;
  let browser: Browser;
  let mockCrawlResult: CrawlResult;
  
  // Start a local server to serve the test HTML
  beforeAll(async () => {
    // Create a simple HTTP server to serve the test HTML
    server = http.createServer((req, res) => {
      fs.readFile(TEST_HTML_PATH, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading test page');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
    });
    
    // Start the server on a random port
    await new Promise<void>(resolve => {
      server.listen(0, 'localhost', () => {
        const address = server.address() as { port: number };
        serverUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
    
    // Launch a browser for testing
    browser = await chromium.launch();
    
    // Create mock crawl result pointing to our test server
    mockCrawlResult = {
      baseUrl: serverUrl,
      crawledPages: [
        {
          url: serverUrl,
          title: 'Test Page for Color Extraction',
          status: 200,
          contentType: 'text/html'
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    // Create output directory if it doesn't exist
    const outputDir = path.resolve(__dirname, '../../../test-results/raw');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });
  
  afterAll(async () => {
    // Close the browser
    await browser.close();
    
    // Close the server
    await new Promise<void>(resolve => {
      server.close(() => resolve());
    });
  });
  
  it('should extract colors from a real HTML page', async () => {
    // Create a color extractor with default options
    const extractor = new ColorExtractorStage({
      includeTextColors: true,
      includeBackgroundColors: true,
      includeBorderColors: true,
      minimumOccurrences: 1,
      outputDir: path.resolve(__dirname, '../../../test-results')
    });
    
    // Process the mock crawl result
    const result = await extractor.process(mockCrawlResult);
    
    // Verify that we extracted colors
    expect(result.tokens.length).toBeGreaterThan(0);
    
    // Check for specific colors from our test HTML
    const primaryColor = result.tokens.find(token => 
      token.value === '#0066cc' || token.value.includes('rgb(0, 102, 204)')
    );
    expect(primaryColor).toBeDefined();
    
    const secondaryColor = result.tokens.find(token => 
      token.value === '#ff9900' || token.value.includes('rgb(255, 153, 0)')
    );
    expect(secondaryColor).toBeDefined();
    
    const textColor = result.tokens.find(token => 
      token.value === '#333333' || token.value.includes('rgb(51, 51, 51)')
    );
    expect(textColor).toBeDefined();
    
    // Check that we have the expected categories
    expect(result.tokens.some(token => token.category === 'text')).toBe(true);
    expect(result.tokens.some(token => token.category === 'background')).toBe(true);
    expect(result.tokens.some(token => token.category === 'border')).toBe(true);
    
    // Check that the stats are populated
    expect(result.stats.totalColors).toBeGreaterThan(0);
    expect(result.stats.uniqueColors).toBeGreaterThan(0);
    expect(result.stats.textColors).toBeGreaterThanOrEqual(0);
    expect(result.stats.backgroundColors).toBeGreaterThanOrEqual(0);
    expect(result.stats.borderColors).toBeGreaterThanOrEqual(0);
  });
  
  it('should respect extraction options', async () => {
    // Create a color extractor that only extracts text colors
    const textOnlyExtractor = new ColorExtractorStage({
      includeTextColors: true,
      includeBackgroundColors: false,
      includeBorderColors: false,
      minimumOccurrences: 1,
      outputDir: path.resolve(__dirname, '../../../test-results')
    });
    
    // Process the mock crawl result
    const result = await textOnlyExtractor.process(mockCrawlResult);
    
    // Verify that we only have text colors
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(result.tokens.every(token => token.category === 'text')).toBe(true);
    expect(result.tokens.some(token => token.category === 'background')).toBe(false);
    expect(result.tokens.some(token => token.category === 'border')).toBe(false);
  });
  
  it('should handle pages with no colors', async () => {
    // Create a mock crawl result with a non-existent page
    const emptyResult: CrawlResult = {
      baseUrl: 'http://localhost:12345', // Non-existent server
      crawledPages: [
        {
          url: 'http://localhost:12345',
          title: 'Non-existent Page',
          status: 404,
          contentType: 'text/html'
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    // Create a color extractor
    const extractor = new ColorExtractorStage({
      includeTextColors: true,
      includeBackgroundColors: true,
      includeBorderColors: true,
      minimumOccurrences: 1,
      outputDir: path.resolve(__dirname, '../../../test-results')
    });
    
    // The extractor should not throw an error
    await expect(extractor.process(emptyResult)).resolves.not.toThrow();
    
    // But we should have no tokens or empty stats
    const result = await extractor.process(emptyResult);
    expect(result.tokens.length).toBe(0);
    expect(result.stats.totalColors).toBe(0);
  });
});
