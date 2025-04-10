/**
 * Tests for the extract-typography.js module
 *
 * These tests verify that the typography extraction functionality works correctly,
 * including parsing, categorizing, and processing typography values.
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
const extractTypography = require('../../src/extractors/extract-typography');

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

describe('Typography Extractor', () => {
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

  describe('extractTypographyFromCrawledPages', () => {
    test('processes crawl results and extracts typography', async () => {
      // Setup
      const mockPage = {
        goto: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockResolvedValue({
          'h1': [{ styles: { 'font-family': 'Arial', 'font-size': '24px', 'font-weight': '700', 'line-height': '1.5', 'letter-spacing': 'normal' } }],
          'p': [{ styles: { 'font-family': 'Helvetica', 'font-size': '16px', 'font-weight': '400', 'line-height': '2', 'letter-spacing': '0.5px' } }]
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
      await extractTypography.extractTypographyFromCrawledPages();

      // Verify
      expect(chromium.launch).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();

      // Check that the written content has the expected structure
      const writeCall = fs.writeFileSync.mock.calls[0];
      const writtenContent = writeCall[1];
      const parsedContent = JSON.parse(writtenContent);

      expect(parsedContent).toHaveProperty('allFontFamilies');
      expect(parsedContent).toHaveProperty('allFontSizes');
      expect(parsedContent).toHaveProperty('allFontWeights');
      expect(parsedContent).toHaveProperty('allLineHeights');
      expect(parsedContent).toHaveProperty('allLetterSpacings');
      expect(parsedContent).toHaveProperty('cssVars');
    });

    test('handles errors gracefully', async () => {
      // Setup
      const originalLaunch = chromium.launch;
      chromium.launch = jest.fn().mockRejectedValue(new Error('Browser launch failed'));
      console.error = jest.fn(); // Mock console.error

      try {
        // Execute
        await extractTypography.extractTypographyFromCrawledPages();

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

  describe('extractTypographyFromPage', () => {
    test('extracts typography from a page', async () => {
      // Setup
      const mockPage = {
        goto: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockImplementation(async (fn) => {
          // Return a mock result that matches the structure expected by the function
          return {
            'h1': [{ styles: { 'font-family': 'Arial', 'font-size': '24px', 'font-weight': '700', 'line-height': '1.5', 'letter-spacing': 'normal' } }],
            'p': [{ styles: { 'font-family': 'Helvetica', 'font-size': '16px', 'font-weight': '400', 'line-height': '2', 'letter-spacing': '0.5px' } }]
          };
        })
      };

      // Execute
      const result = await extractTypography.extractTypographyFromPage(mockPage, 'https://example.com');

      // Verify
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(result).toHaveProperty('allFontFamilies');
      expect(result).toHaveProperty('allFontSizes');
      expect(result).toHaveProperty('allFontWeights');
      expect(result).toHaveProperty('allLineHeights');
      expect(result).toHaveProperty('allLetterSpacings');
      expect(result).toHaveProperty('cssVars');
      expect(Array.isArray(result.allFontFamilies)).toBe(true);
      expect(result.allFontFamilies.length).toBeGreaterThan(0);
    });

    test('handles evaluation errors', async () => {
      // Setup
      const mockPage = {
        goto: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockRejectedValue(new Error('Evaluation failed'))
      };
      console.error = jest.fn(); // Mock console.error

      // Execute
      const result = await extractTypography.extractTypographyFromPage(mockPage, 'https://example.com');

      // Verify
      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
      expect(result).toEqual({
        allFontFamilies: [],
        allFontSizes: [],
        allFontWeights: [],
        allLineHeights: [],
        allLetterSpacings: [],
        cssVars: {},
        typographyStyles: {}
      });
    });
  });

  // Additional tests for helper functions can be added here
});
