/**
 * Tests for the extract-components.js module
 *
 * These tests verify that the component extraction functionality works correctly,
 * including identifying, extracting, and processing UI components.
 */

// Mock the fs module
jest.mock('fs');

// Mock Playwright before importing the module
jest.mock('@playwright/test');

// Import modules after mocking
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

// Import the module after mocking
const extractComponents = require('../../src/extractors/extract-components');

// Setup mock implementations for chromium
chromium.launch = jest.fn().mockResolvedValue({
  newContext: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn().mockResolvedValue({}),
      evaluate: jest.fn(),
      close: jest.fn(),
      setContent: jest.fn(),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-image'))
    }),
    close: jest.fn()
  }),
  close: jest.fn()
});

// Mock console methods
console.log = jest.fn();
console.error = jest.fn();

describe('extract-components', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    fs.readFileSync.mockImplementation((path) => {
      if (path.includes('crawl-results.json')) {
        return JSON.stringify({
          baseUrl: 'https://example.com',
          crawledPages: [
            {
              url: 'https://example.com',
              title: 'Example Page',
              status: 200,
              bodyClasses: 'home page'
            },
            {
              url: 'https://example.com/about',
              title: 'About Page',
              status: 200,
              bodyClasses: 'about page'
            }
          ]
        });
      }
      throw new Error(`File not found: ${path}`);
    });
    fs.writeFileSync.mockImplementation(() => {});
    fs.existsSync.mockImplementation((path) => {
      return path.includes('crawl-results.json');
    });
    fs.mkdirSync.mockImplementation(() => {});
  });

  describe('extractComponentsFromPage', () => {
    test('extracts components from a page', async () => {
      // Setup
      const mockPage = {
        goto: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockResolvedValue([
          {
            type: 'card',
            id: 'card-1',
            classes: ['card', 'shadow'],
            attributes: { 'data-component': 'card' },
            styles: {
              'background-color': '#ffffff',
              'border-radius': '4px',
              'box-shadow': '0 2px 4px rgba(0,0,0,0.1)'
            },
            scripts: [],
            html: '<div class="card shadow" id="card-1" data-component="card">Card content</div>',
            children: 2,
            textContent: 'Card content'
          }
        ])
      };

      // Execute
      const result = await extractComponents.extractComponentsFromPage(mockPage, 'https://example.com');

      // Verify
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.any(Object));
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('type', 'card');
      expect(result.data[0]).toHaveProperty('id', 'card-1');
      expect(result.data[0]).toHaveProperty('classes');
      expect(result.data[0].classes).toContain('card');
    });

    test('handles evaluation errors', async () => {
      // Setup
      const mockPage = {
        goto: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockRejectedValue(new Error('Evaluation failed'))
      };

      // Execute
      const result = await extractComponents.extractComponentsFromPage(mockPage, 'https://example.com');

      // Verify
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.any(Object));
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toHaveProperty('message', 'Evaluation failed');
      expect(result.error).toHaveProperty('type', 'Error');
    });
  });

  describe('extractComponentsFromCrawledPages', () => {
    test('processes crawl results and extracts components', async () => {
      // Setup
      const mockPage = {
        goto: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockResolvedValue([
          {
            type: 'card',
            id: 'card-1',
            classes: ['card', 'shadow'],
            attributes: { 'data-component': 'card' },
            styles: {
              'background-color': '#ffffff',
              'border-radius': '4px',
              'box-shadow': '0 2px 4px rgba(0,0,0,0.1)'
            },
            scripts: [],
            html: '<div class="card shadow" id="card-1" data-component="card">Card content</div>',
            children: 2,
            textContent: 'Card content'
          }
        ]),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
        close: jest.fn(),
        setContent: jest.fn()
      };

      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn()
      };

      chromium.launch.mockResolvedValue(mockBrowser);

      // Execute
      const result = await extractComponents.extractComponentsFromCrawledPages();

      // Verify
      expect(chromium.launch).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();

      // Check that the result has the expected structure
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('results');
      expect(result.data).toHaveProperty('componentLibrary');
      expect(result.data.results).toHaveProperty('pagesAnalyzed');
      expect(result.data.results).toHaveProperty('components');
      expect(result.data.componentLibrary).toHaveProperty('types');
      expect(result.data.componentLibrary).toHaveProperty('components');
    });

    test('handles file not found errors', async () => {
      // Setup
      fs.existsSync.mockReturnValue(false);

      // Execute
      const result = await extractComponents.extractComponentsFromCrawledPages();

      // Verify
      expect(fs.existsSync).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toHaveProperty('type', 'FileNotFoundError');
    });

    test('handles browser launch errors', async () => {
      // Setup
      chromium.launch.mockRejectedValue(new Error('Browser launch failed'));

      // Execute
      const result = await extractComponents.extractComponentsFromCrawledPages();

      // Verify
      expect(chromium.launch).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toHaveProperty('message', 'Browser launch failed');
    });

    test('handles page evaluation errors', async () => {
      // Setup
      const mockPage = {
        goto: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockRejectedValue(new Error('Evaluation failed')),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
        close: jest.fn(),
        setContent: jest.fn()
      };

      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn()
      };

      chromium.launch.mockResolvedValue(mockBrowser);

      // Execute
      const result = await extractComponents.extractComponentsFromCrawledPages();

      // Verify
      expect(chromium.launch).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalled();
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled(); // Should still write results even with errors

      // Check that the result has the expected structure
      expect(result.success).toBe(true);
      expect(result.data.results.pagesAnalyzed).toHaveLength(0);
      expect(result.data.results.components).toHaveLength(0);
    });
  });
});
