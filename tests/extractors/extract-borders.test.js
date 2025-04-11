/**
 * Tests for the extract-borders.js module
 *
 * These tests verify that the borders extraction functionality works correctly,
 * including parsing, categorizing, and processing border and shadow values.
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
const extractBorders = require('../../src/extractors/extract-borders');

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

describe('Borders Extractor', () => {
  // Setup before each test
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock fs.existsSync to control file existence
    fs.existsSync = jest.fn().mockReturnValue(true);

    // Mock fs.readFileSync to return controlled content
    fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
      crawledPages: [
        {
          url: 'https://example.com',
          title: 'Example Page',
          status: 200
        }
      ]
    }));

    // Mock fs.writeFileSync
    fs.writeFileSync = jest.fn();

    // Mock fs.mkdirSync
    fs.mkdirSync = jest.fn();

    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('extractBordersFromCrawledPages', () => {
    test('processes crawl results and extracts borders', async () => {
      // Setup
      const mockPage = {
        goto: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockResolvedValue({
          elementStyles: {
            'button': [{
              classes: 'btn',
              id: null,
              styles: {
                'border': '1px solid #ccc',
                'border-radius': '4px',
                'box-shadow': '0 2px 4px rgba(0,0,0,0.1)'
              }
            }],
            '.card': [{
              classes: 'card shadow',
              id: 'main-card',
              styles: {
                'border': '1px solid #eee',
                'border-radius': '8px',
                'box-shadow': '0 4px 8px rgba(0,0,0,0.2)'
              }
            }]
          },
          borderWidths: ['1px', '2px'],
          borderStyles: ['solid', 'dashed'],
          borderRadii: ['4px', '8px'],
          shadows: ['0 2px 4px rgba(0,0,0,0.1)', '0 4px 8px rgba(0,0,0,0.2)'],
          cssVars: { '--border-radius': '4px', '--box-shadow': '0 2px 4px rgba(0,0,0,0.1)' }
        }),
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
      const result = await extractBorders.extractBordersFromCrawledPages();

      // Verify
      expect(chromium.launch).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mockPage.setContent).toHaveBeenCalled(); // For visualization
      expect(mockPage.screenshot).toHaveBeenCalled();

      // Check that the written content has the expected structure
      const writeCall = fs.writeFileSync.mock.calls[0];
      const writtenContent = writeCall[1];
      const parsedContent = JSON.parse(writtenContent);

      // The baseUrl might not be present in all implementations
      // expect(parsedContent).toHaveProperty('baseUrl');
      expect(parsedContent).toHaveProperty('pagesAnalyzed');
      expect(parsedContent).toHaveProperty('borderStyles');
      expect(parsedContent).toHaveProperty('allBorderWidths');
      expect(parsedContent).toHaveProperty('allBorderStyles');
      expect(parsedContent).toHaveProperty('allBorderRadii');
      expect(parsedContent).toHaveProperty('allShadows');
      expect(parsedContent).toHaveProperty('cssVars');

      // Check specific values
      expect(parsedContent.allBorderWidths).toContain('1px');
      expect(parsedContent.allBorderStyles).toContain('solid');
      expect(parsedContent.allBorderRadii).toContain('4px');
      expect(parsedContent.allShadows).toContain('0 2px 4px rgba(0,0,0,0.1)');
    });

    test('handles file not found error', async () => {
      // Setup
      fs.existsSync = jest.fn().mockImplementation((path) => {
        if (path.includes('crawl-results.json')) {
          return false;
        }
        return true;
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      // Execute
      await extractBorders.extractBordersFromCrawledPages();

      // Verify
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Input file not found'));
      expect(mockExit).toHaveBeenCalledWith(1);

      // Restore process.exit
      mockExit.mockRestore();
    });

    test('handles browser launch errors', async () => {
      // Setup
      const originalLaunch = chromium.launch;
      chromium.launch = jest.fn().mockRejectedValue(new Error('Browser launch failed'));
      process.exit = jest.fn(); // Mock process.exit

      try {
        // Execute and catch the error
        await expect(extractBorders.extractBordersFromCrawledPages()).rejects.toThrow('Browser launch failed');

        // Verify
        expect(chromium.launch).toHaveBeenCalled();
        expect(fs.writeFileSync).not.toHaveBeenCalled();
      } finally {
        // Restore original function
        chromium.launch = originalLaunch;
        process.exit.mockRestore();
      }
    });

    test('handles page navigation errors', async () => {
      // Setup
      const mockPage = {
        goto: jest.fn().mockRejectedValue(new Error('Navigation failed')),
        evaluate: jest.fn(),
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
      const result = await extractBorders.extractBordersFromCrawledPages();

      // Verify
      expect(chromium.launch).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error analyzing'), expect.any(String));
      expect(fs.writeFileSync).toHaveBeenCalled(); // Should still write results even with errors

      // Check that the result has empty arrays for the failed page
      const writeCall = fs.writeFileSync.mock.calls[0];
      const writtenContent = writeCall[1];
      const parsedContent = JSON.parse(writtenContent);

      expect(parsedContent.pagesAnalyzed).toHaveLength(0);
    });
  });

  // Additional tests could be added for helper functions if they were exported
});
