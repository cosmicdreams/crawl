// tests/integration/extractors/typography-extractor.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TypographyExtractor } from '../../../src/core/stages/typography-extractor.js';
import { CrawlConfig } from '../../../src/core/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { chromium, Browser } from 'playwright';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to the test HTML file
const TEST_HTML_PATH = path.resolve(__dirname, '../../fixtures/html/typography-test.html');

describe('TypographyExtractor Integration Test', () => {
  let server: http.Server;
  let serverUrl: string;
  let browser: Browser;
  let crawlResults: any;
  
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
    
    // Create a context and page
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to the test page
    await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
    
    // Extract typography information
    const typography = await page.evaluate(() => {
      const extractTypography = (selector: string) => {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).map(el => {
          const style = window.getComputedStyle(el);
          return {
            selector,
            element: el.tagName.toLowerCase(),
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing,
            text: el.textContent?.trim().substring(0, 50),
            count: 1
          };
        });
      };
      
      return {
        headings: [
          ...extractTypography('h1'),
          ...extractTypography('h2'),
          ...extractTypography('h3'),
          ...extractTypography('h4'),
          ...extractTypography('h5'),
          ...extractTypography('h6')
        ],
        bodyText: [
          ...extractTypography('p'),
          ...extractTypography('.lead'),
          ...extractTypography('small'),
          ...extractTypography('.small'),
          ...extractTypography('.caption')
        ],
        specialText: [
          ...extractTypography('blockquote'),
          ...extractTypography('code'),
          ...extractTypography('pre'),
          ...extractTypography('.button')
        ]
      };
    });
    
    // Create mock crawl result with the extracted typography
    crawlResults = {
      baseUrl: serverUrl,
      crawledPages: [
        {
          url: serverUrl,
          title: 'Typography Test Page',
          status: 200,
          contentType: 'text/html',
          typography
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    // Close the page and context
    await page.close();
    await context.close();
    
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
  
  it('should extract typography styles from a real HTML page', async () => {
    // Create a typography extractor
    const extractor = new TypographyExtractor();
    
    // Create a config
    const config: CrawlConfig = {
      baseUrl: serverUrl,
      maxPages: 1,
      timeout: 30000,
      ignorePatterns: [],
      ignoreExtensions: [],
      screenshots: false,
      outputDir: path.resolve(__dirname, '../../../test-results'),
      extractors: {
        typography: {
          includeHeadings: true,
          includeBodyText: true,
          includeSpecialText: true,
          minOccurrences: 1
        }
      }
    };
    
    // Process the mock crawl result
    const result = await extractor.process(crawlResults, config);
    
    // Verify that we extracted typography styles
    expect(result.length).toBeGreaterThan(0);
    
    // Check for specific typography styles from our test HTML
    const h1Style = result.find(token => 
      token.properties?.element === 'h1' && 
      token.properties?.fontSize === '2.5rem'
    );
    expect(h1Style).toBeDefined();
    expect(h1Style?.name).toBe('heading-1');
    
    const paragraphStyle = result.find(token => 
      token.properties?.element === 'p' && 
      token.category === 'body'
    );
    expect(paragraphStyle).toBeDefined();
    expect(paragraphStyle?.name).toBe('body-text');
    
    // Check that we have the expected categories
    expect(result.some(token => token.category === 'heading')).toBe(true);
    expect(result.some(token => token.category === 'body')).toBe(true);
    
    // Check that all tokens have the required properties
    result.forEach(token => {
      expect(token).toHaveProperty('name');
      expect(token).toHaveProperty('value');
      expect(token).toHaveProperty('type', 'typography');
      expect(token).toHaveProperty('category');
      expect(token).toHaveProperty('properties');
      expect(token.properties).toHaveProperty('fontFamily');
      expect(token.properties).toHaveProperty('fontSize');
      expect(token.properties).toHaveProperty('fontWeight');
      expect(token.properties).toHaveProperty('lineHeight');
    });
  });
  
  it('should respect extraction options', async () => {
    // Create a typography extractor
    const extractor = new TypographyExtractor();
    
    // Create a config that only includes headings
    const headingsOnlyConfig: CrawlConfig = {
      baseUrl: serverUrl,
      maxPages: 1,
      timeout: 30000,
      ignorePatterns: [],
      ignoreExtensions: [],
      screenshots: false,
      outputDir: path.resolve(__dirname, '../../../test-results'),
      extractors: {
        typography: {
          includeHeadings: true,
          includeBodyText: false,
          includeSpecialText: false,
          minOccurrences: 1
        }
      }
    };
    
    // Process the mock crawl result
    const result = await extractor.process(crawlResults, headingsOnlyConfig);
    
    // Verify that we only have heading styles
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(token => token.category === 'heading')).toBe(true);
    expect(result.some(token => token.category === 'body')).toBe(false);
    expect(result.some(token => token.category === 'special')).toBe(false);
  });
  
  it('should handle minimum occurrences filtering', async () => {
    // Create a typography extractor
    const extractor = new TypographyExtractor();
    
    // Create a config with a high minimum occurrences threshold
    const highThresholdConfig: CrawlConfig = {
      baseUrl: serverUrl,
      maxPages: 1,
      timeout: 30000,
      ignorePatterns: [],
      ignoreExtensions: [],
      screenshots: false,
      outputDir: path.resolve(__dirname, '../../../test-results'),
      extractors: {
        typography: {
          includeHeadings: true,
          includeBodyText: true,
          includeSpecialText: true,
          minOccurrences: 10 // Set a high threshold that no style will meet
        }
      }
    };
    
    // Process the mock crawl result
    const result = await extractor.process(crawlResults, highThresholdConfig);
    
    // We should have no tokens because none meet the minimum occurrences
    expect(result.length).toBe(0);
  });
});
