/**
 * Tests for the extract-colors.js module
 *
 * These tests verify that the color extraction functionality works correctly,
 * including parsing, categorizing, and processing color values.
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
const extractColors = require('../../src/extractors/extract-colors');

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

describe('Color Extractor', () => {
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
  });

  describe('extractColorsFromCrawledPages', () => {
    test('processes crawl results and extracts colors', async () => {
      // Setup
      const mockPage = {
        goto: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockResolvedValue({
          elementStyles: {
            'body': [{ styles: { 'color': '#000000', 'background-color': '#ffffff' } }]
          },
          colorValues: ['#000000', '#ffffff'],
          cssVars: { '--primary-color': '#ff0000' }
        }),
        close: jest.fn()
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
      await extractColors.extractColorsFromCrawledPages();

      // Verify
      expect(chromium.launch).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();

      // Check that the written content has the expected structure
      const writeCall = fs.writeFileSync.mock.calls[0];
      const writtenContent = writeCall[1];
      const parsedContent = JSON.parse(writtenContent);

      expect(parsedContent).toHaveProperty('allColorValues');
      expect(parsedContent).toHaveProperty('elementStyles');
      expect(parsedContent).toHaveProperty('cssVars');
    });

    test('handles errors gracefully', async () => {
      // Setup
      const originalLaunch = chromium.launch;
      chromium.launch = jest.fn().mockRejectedValue(new Error('Browser launch failed'));
      console.error = jest.fn(); // Mock console.error

      try {
        // Execute
        await extractColors.extractColorsFromCrawledPages();

        // Verify
        expect(chromium.launch).toHaveBeenCalled();
        expect(console.error).toHaveBeenCalled();
        expect(fs.writeFileSync).not.toHaveBeenCalled();
      } finally {
        // Restore original function
        chromium.launch = originalLaunch;
      }
    });
  });

  describe('extractColorsFromPage', () => {
    test('extracts colors from a page', async () => {
      // Setup
      const mockPage = {
        goto: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockImplementation(async (fn) => {
          // Return a mock result that matches the structure expected by the function
          return {
            elementStyles: {
              'body': [{ color: '#000000', backgroundColor: '#ffffff' }]
            },
            colorValues: ['#000000', '#ffffff'],
            cssVars: { '--primary-color': '#ff0000' }
          };
        })
      };

      // Execute
      const result = await extractColors.extractColorsFromPage(mockPage, 'https://example.com');

      // Verify
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(result).toHaveProperty('elementStyles');
      expect(result).toHaveProperty('colorValues');
      expect(result).toHaveProperty('cssVars');
      expect(result.colorValues).toContain('#000000');
      expect(result.colorValues).toContain('#ffffff');
    });

    test('handles evaluation errors', async () => {
      // Setup
      const mockPage = {
        goto: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockRejectedValue(new Error('Evaluation failed'))
      };
      console.error = jest.fn(); // Mock console.error

      // Execute
      const result = await extractColors.extractColorsFromPage(mockPage, 'https://example.com');

      // Verify
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
      expect(result).toEqual({
        elementStyles: {},
        colorValues: [],
        cssVars: {}
      });
    });
  });

  // Additional tests for helper functions can be added here
});
